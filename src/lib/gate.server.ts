import { createHash, randomUUID } from "node:crypto";

import type { GateReceipt, Settlement, Snapshot } from "@/lib/gate-types";
import {
  cents,
  evaluatePolicy,
  formatUsd,
  fromCents,
  normalizeRecipient,
  parsePayment,
  parsePolicy,
  usdToUsdcUnits,
  type HumanPolicy,
  type PaymentRequest,
} from "@/lib/policy";

export type { GateReceipt, Snapshot };

const MAX_PENDING = 20;
const MAX_IDEMPOTENCY = 200;

type Pending = {
  receipt: GateReceipt;
  request: PaymentRequest;
  reservedCents: number;
  idempotencyKey: string | null;
};

type IdempotencyHit = { hash: string; receipt: GateReceipt };

type State = {
  policy: HumanPolicy | null;
  day: string;
  spentCents: number;
  balanceCents: number;
  pending: Pending[];
  ledger: GateReceipt[];
  idempotency: Map<string, IdempotencyHit>;
};

type Outcome = { receipt: GateReceipt; remember: boolean };

const g = globalThis as typeof globalThis & { __ledgerGate?: State };

let clock = (): Date => new Date();

export function resetGateForTests() {
  g.__ledgerGate = undefined;
  queue = Promise.resolve();
  clock = () => new Date();
}

export function setGateClockForTests(next: () => Date) {
  clock = next;
}

function today(): string {
  return clock().toISOString().slice(0, 10);
}

function blankState(): State {
  return {
    policy: null,
    day: today(),
    spentCents: 0,
    balanceCents: 0,
    pending: [],
    ledger: [],
    idempotency: new Map(),
  };
}

function dropLedgerRow(current: State, id: string) {
  current.ledger = current.ledger.filter((item) => item.id !== id);
}

function retarget(current: State, oldId: string, receipt: GateReceipt) {
  for (const hit of current.idempotency.values()) {
    if (hit.receipt.id === oldId) hit.receipt = receipt;
  }
}

function cancelPending(current: State, rule: string, detail: string) {
  const stale = current.pending;
  current.pending = [];
  for (const item of stale) {
    release(current, item);
    const receipt: GateReceipt = {
      ...item.receipt,
      id: randomUUID(),
      at: clock().toISOString(),
      status: "cancelled",
      rule,
      detail,
      settlement: null,
      remainingDailyUsd: fromCents(remainingCents(current)),
      spentUsd: fromCents(current.spentCents),
      balanceUsd: fromCents(current.balanceCents),
    };
    retarget(current, item.receipt.id, receipt);
    dropLedgerRow(current, item.receipt.id);
    pushLedger(current, receipt);
  }
}

function state(): State {
  if (!g.__ledgerGate) g.__ledgerGate = blankState();
  const current = g.__ledgerGate;
  const day = today();
  if (current.day !== day) {
    current.day = day;
    current.spentCents = 0;
    current.pending = current.pending.map((item) => ({ ...item, reservedCents: 0 }));
    cancelPending(
      current,
      "day_rolled",
      "The UTC day changed before a human approved this payment. The hold was released. Nothing was signed.",
    );
  }
  return current;
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function fingerprint(policy: HumanPolicy): string {
  const canonical = JSON.stringify({
    max: cents(policy.maxPerTransactionUsd),
    daily: cents(policy.dailyLimitUsd),
    recipients: policy.allowedRecipients.map(normalizeRecipient).sort(),
    approval: cents(policy.approvalThresholdUsd),
    assets: policy.allowedAssets,
    frozen: policy.frozen,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function remainingCents(current: State): number {
  if (!current.policy) return 0;
  return Math.max(0, cents(current.policy.dailyLimitUsd) - current.spentCents);
}

function heldCents(current: State): number {
  return current.pending.reduce((sum, item) => sum + item.reservedCents, 0);
}

export function snapshot(): Snapshot {
  const current = state();
  const policy = current.policy;
  return {
    policy,
    fingerprint: policy ? fingerprint(policy) : null,
    spentUsd: fromCents(current.spentCents),
    remainingDailyUsd: policy ? fromCents(remainingCents(current)) : null,
    balanceUsd: fromCents(current.balanceCents),
    pending: current.pending.map((item) => item.receipt),
    ledger: current.ledger,
    enforcement: "local-policy-gate",
    liveKey: Boolean(process.env.OUTLAYER_API_KEY),
  };
}

function pushLedger(current: State, receipt: GateReceipt) {
  current.ledger = [receipt, ...current.ledger.filter((item) => item.id !== receipt.id)].slice(0, 40);
}

function usage(current: State) {
  return {
    spentUsd: fromCents(current.spentCents),
    balanceUsd: fromCents(current.balanceCents - heldCents(current)),
  };
}

function requestHash(request: PaymentRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        amount: cents(request.amountUsd),
        asset: request.asset.trim().toUpperCase(),
        to: normalizeRecipient(request.to),
        chain: request.chain,
        purpose: request.purpose,
      }),
    )
    .digest("hex");
}

function settlementFor(request: PaymentRequest, live: Settlement["live"]): Settlement {
  return {
    protocol: "near-intents-1click",
    submitted: false,
    sourceChain: "near",
    destinationChain: request.chain,
    asset: "USDC",
    token: "nep141:usdc.near",
    amountUnits: usdToUsdcUnits(request.amountUsd),
    recipient: request.to,
    calls: [
      "POST https://1click.chaindefuser.com/v0/quote",
      "POST https://api.outlayer.ai/wallet/v1/intents/withdraw",
    ],
    live,
  };
}

async function liveDryRun(
  request: PaymentRequest,
): Promise<(Settlement["live"] & { verdict: "ok" | "refused" | "retry" }) | null> {
  const key = process.env.OUTLAYER_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://api.outlayer.ai/wallet/v1/intents/withdraw/dry-run", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chain: request.chain,
        to: request.to,
        amount: usdToUsdcUnits(request.amountUsd),
        token: "nep141:usdc.near",
      }),
    });
    const text = (await res.text()).slice(0, 280);
    let record: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") record = parsed as Record<string, unknown>;
    } catch {
      record = null;
    }
    const reason = typeof record?.reason === "string" ? record.reason : "";
    const message = typeof record?.message === "string" ? record.message : text;
    let verdict: "ok" | "refused" | "retry";
    if (res.status === 429 || res.status >= 500) verdict = "retry";
    else if (res.status >= 200 && res.status < 300 && record?.would_succeed === true) verdict = "ok";
    else if (res.status >= 200 && res.status < 300 && record?.would_succeed !== false) verdict = "retry";
    else verdict = "refused";
    const note =
      verdict === "ok"
        ? "OutLayer dry-run would succeed. Nothing was broadcast."
        : verdict === "retry"
          ? `OutLayer dry-run could not be judged (${res.status}). ${message}`
          : `OutLayer dry-run refused the payment${reason ? ` (${reason})` : ""}. ${message}`;
    return { httpStatus: res.status, note, verdict };
  } catch (error) {
    const message = error instanceof Error ? error.message : "dry-run failed";
    return { httpStatus: 0, note: `OutLayer dry-run did not complete. ${message}`, verdict: "retry" };
  } finally {
    clearTimeout(timer);
  }
}

function receiptBase(
  current: State,
  request: PaymentRequest,
  ignoredFields: string[],
  decision: { status: GateReceipt["status"]; rule: string | null; detail: string },
  id: string,
): GateReceipt {
  const policy = current.policy;
  if (!policy) throw new Error("No policy");
  const fp = fingerprint(policy);
  return {
    id,
    at: clock().toISOString(),
    request,
    status: decision.status,
    rule: decision.rule,
    detail: decision.detail,
    remainingDailyUsd: fromCents(remainingCents(current)),
    spentUsd: fromCents(current.spentCents),
    balanceUsd: fromCents(current.balanceCents),
    ignoredFields,
    attestation: {
      kind: "local-policy-gate",
      policyFingerprint: fp,
      statement: `Policy ${fp} was evaluated outside the model. The request could not set approved, raise a limit, or sign.`,
    },
    settlement: null,
  };
}

function release(current: State, pending: Pending) {
  current.spentCents = Math.max(0, current.spentCents - pending.reservedCents);
}

export function publishPolicy(input: unknown): Promise<Snapshot> {
  return enqueue(async () => {
    const current = state();
    const next = parsePolicy(input);
    current.policy = next;
    if (next.frozen) cancelPending(current, "frozen", "The wallet was frozen. Waiting payments were dropped and nothing was signed.");
    return snapshot();
  });
}

export function prepareDemo(input: unknown): Promise<Snapshot> {
  return enqueue(async () => {
    const current = state();
    current.policy = parsePolicy(input);
    current.balanceCents = cents(200);
    current.spentCents = 0;
    for (const item of current.pending) dropLedgerRow(current, item.receipt.id);
    current.pending = [];
    current.idempotency = new Map();
    current.day = today();
    return snapshot();
  });
}

export function fundWallet(amountUsd: number, mode: "add" | "set" = "add"): Promise<Snapshot> {
  return enqueue(async () => {
    const current = state();
    const next = cents(amountUsd);
    current.balanceCents = mode === "set" ? next : current.balanceCents + next;
    return snapshot();
  });
}

async function decide(
  request: PaymentRequest,
  ignoredFields: string[],
  honorApproval: boolean,
  id: string,
  idempotencyKey: string | null,
): Promise<Outcome> {
  const current = state();
  if (!current.policy) {
    throw new Error("No policy is published. The human has to save one before the agent can ask.");
  }
  const seenDay = current.day;
  const decision = evaluatePolicy(current.policy, request, usage(current), { honorApproval });
  if (decision.status === "allow") {
    const live = await liveDryRun(request);
    if (current.day !== seenDay) {
      const receipt = receiptBase(
        current,
        request,
        ignoredFields,
        {
          status: "reject",
          rule: "day_rolled",
          detail: "The UTC day changed while this payment was being checked. Nothing was reserved.",
        },
        id,
      );
      pushLedger(current, receipt);
      return { receipt, remember: false };
    }
    if (live && live.verdict !== "ok") {
      const unconfirmed = live.verdict === "retry";
      const receipt = receiptBase(
        current,
        request,
        ignoredFields,
        {
          status: "reject",
          rule: unconfirmed ? "settlement_unconfirmed" : "settlement_refused",
          detail: unconfirmed
            ? "The policy would have allowed this, but the settlement check did not finish. Nothing was reserved. Retry."
            : `The policy would have allowed this, but the settlement check refused it. Nothing was reserved. ${live.note}`,
        },
        id,
      );
      pushLedger(current, receipt);
      return { receipt, remember: !unconfirmed };
    }
    current.spentCents += cents(request.amountUsd);
    current.balanceCents -= cents(request.amountUsd);
    const receipt = receiptBase(current, request, ignoredFields, decision, id);
    receipt.remainingDailyUsd = fromCents(remainingCents(current));
    receipt.spentUsd = fromCents(current.spentCents);
    receipt.balanceUsd = fromCents(current.balanceCents);
    receipt.settlement = settlementFor(request, live);
    if (live && live.verdict === "ok") {
      receipt.attestation = {
        kind: "outlayer-dry-run",
        policyFingerprint: receipt.attestation.policyFingerprint,
        statement: `${live.note} Policy ${receipt.attestation.policyFingerprint} still ran outside the model. No transaction hash exists because nothing was broadcast.`,
      };
    } else {
      receipt.attestation.statement = `Allowed by the local policy gate (${receipt.attestation.policyFingerprint}), not a TEE attestation. ${formatUsd(request.amountUsd)} USDC would settle on ${request.chain} via NEAR Intents 1-Click. Nothing was broadcast.`;
    }
    pushLedger(current, receipt);
    return { receipt, remember: true };
  }

  if (decision.status === "needs_approval" && current.pending.length >= MAX_PENDING) {
    const receipt = receiptBase(
      current,
      request,
      ignoredFields,
      {
        status: "reject",
        rule: "pending_full",
        detail: "Too many payments are waiting for a human. This one was not queued and nothing was reserved.",
      },
      id,
    );
    pushLedger(current, receipt);
    return { receipt, remember: false };
  }

  const receipt = receiptBase(current, request, ignoredFields, decision, id);
  if (decision.status === "needs_approval") {
    const reserved = cents(request.amountUsd);
    current.spentCents += reserved;
    receipt.remainingDailyUsd = fromCents(remainingCents(current));
    receipt.spentUsd = fromCents(current.spentCents);
    receipt.settlement = null;
    current.pending = [
      { receipt, request, reservedCents: reserved, idempotencyKey },
      ...current.pending.filter((item) => item.receipt.id !== id),
    ];
  }
  pushLedger(current, receipt);
  return { receipt, remember: decision.status === "needs_approval" };
}

export function submitPayment(input: unknown): Promise<GateReceipt> {
  return enqueue(async () => {
    const { request, ignoredFields, idempotencyKey } = parsePayment(input);
    const current = state();
    const hash = requestHash(request);
    if (idempotencyKey) {
      const prior = current.idempotency.get(idempotencyKey);
      if (prior) {
        if (prior.hash !== hash) {
          throw new Error("Conflict: idempotency key was already used for a different payment");
        }
        return prior.receipt;
      }
      if (current.idempotency.size >= MAX_IDEMPOTENCY) {
        throw new Error("Conflict: the idempotency log is full, so this key was not executed");
      }
    }
    const outcome = await decide(request, ignoredFields, true, randomUUID(), idempotencyKey);
    if (idempotencyKey && outcome.remember) {
      state().idempotency.set(idempotencyKey, { hash, receipt: outcome.receipt });
    }
    return outcome.receipt;
  });
}

export function resolveApproval(id: string, action: "approve" | "reject"): Promise<GateReceipt> {
  return enqueue(async () => {
    const current = state();
    const index = current.pending.findIndex((item) => item.receipt.id === id);
    const pending = index >= 0 ? current.pending[index] : undefined;
    if (!pending) throw new Error("That approval is no longer pending.");
    current.pending.splice(index, 1);
    release(current, pending);
    if (action === "reject") {
      const receipt: GateReceipt = {
        ...pending.receipt,
        id: randomUUID(),
        at: clock().toISOString(),
        status: "cancelled",
        rule: "human_reject",
        detail: "A human rejected this payment. Nothing was signed.",
        settlement: null,
        remainingDailyUsd: fromCents(remainingCents(current)),
        spentUsd: fromCents(current.spentCents),
        balanceUsd: fromCents(current.balanceCents),
      };
      retarget(current, pending.receipt.id, receipt);
      dropLedgerRow(current, pending.receipt.id);
      pushLedger(current, receipt);
      return receipt;
    }
    dropLedgerRow(current, pending.receipt.id);
    const outcome = await decide(pending.request, pending.receipt.ignoredFields, false, randomUUID(), null);
    if (outcome.receipt.rule === "settlement_unconfirmed") {
      dropLedgerRow(current, outcome.receipt.id);
      current.spentCents += pending.reservedCents;
      current.pending = [pending, ...current.pending.filter((item) => item.receipt.id !== pending.receipt.id)];
      pushLedger(current, pending.receipt);
      return outcome.receipt;
    }
    retarget(current, pending.receipt.id, outcome.receipt);
    return outcome.receipt;
  });
}
