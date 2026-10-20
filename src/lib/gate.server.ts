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

type Pending = { receipt: GateReceipt; request: PaymentRequest };

type State = {
  policy: HumanPolicy | null;
  day: string;
  spentCents: number;
  balanceCents: number;
  pending: Pending[];
  ledger: GateReceipt[];
  idempotency: Map<string, string>;
};

const g = globalThis as typeof globalThis & { __ledgerGate?: State };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function state(): State {
  if (!g.__ledgerGate) {
    g.__ledgerGate = {
      policy: null,
      day: today(),
      spentCents: 0,
      balanceCents: 0,
      pending: [],
      ledger: [],
      idempotency: new Map(),
    };
  }
  const current = g.__ledgerGate;
  const day = today();
  if (current.day !== day) {
    current.day = day;
    current.spentCents = 0;
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
    balanceUsd: fromCents(current.balanceCents),
  };
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

async function liveDryRun(request: PaymentRequest): Promise<Settlement["live"]> {
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
    return {
      httpStatus: res.status,
      note: res.ok
        ? "OutLayer accepted the dry-run. Nothing was broadcast."
        : `OutLayer dry-run returned ${res.status}. ${text}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "dry-run failed";
    return { httpStatus: 0, note: `OutLayer dry-run did not complete. ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

function receiptBase(
  current: State,
  request: PaymentRequest,
  ignoredFields: string[],
  decision: ReturnType<typeof evaluatePolicy>,
  id: string,
): GateReceipt {
  const policy = current.policy;
  if (!policy) throw new Error("No policy");
  const fp = fingerprint(policy);
  return {
    id,
    at: new Date().toISOString(),
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

export function publishPolicy(input: unknown): Snapshot {
  state().policy = parsePolicy(input);
  return snapshot();
}

export function prepareDemo(input: unknown): Snapshot {
  const current = state();
  current.policy = parsePolicy(input);
  current.balanceCents = cents(200);
  current.spentCents = 0;
  current.pending = [];
  return snapshot();
}

export function fundWallet(amountUsd: number, mode: "add" | "set"): Snapshot {
  const current = state();
  const next = cents(amountUsd);
  current.balanceCents = mode === "set" ? next : current.balanceCents + next;
  return snapshot();
}

async function decide(
  request: PaymentRequest,
  ignoredFields: string[],
  honorApproval: boolean,
  id: string,
): Promise<GateReceipt> {
  const current = state();
  if (!current.policy) {
    throw new Error("No policy is published. The human has to save one before the agent can ask.");
  }
  const decision = evaluatePolicy(current.policy, request, usage(current), { honorApproval });
  if (decision.status === "allow") {
    current.spentCents += cents(request.amountUsd);
    current.balanceCents -= cents(request.amountUsd);
    const live = await liveDryRun(request);
    const receipt = receiptBase(current, request, ignoredFields, decision, id);
    receipt.remainingDailyUsd = fromCents(remainingCents(current));
    receipt.spentUsd = fromCents(current.spentCents);
    receipt.balanceUsd = fromCents(current.balanceCents);
    receipt.settlement = settlementFor(request, live);
    if (live && live.httpStatus >= 200 && live.httpStatus < 300) {
      receipt.attestation = {
        kind: "outlayer-dry-run",
        policyFingerprint: receipt.attestation.policyFingerprint,
        statement: `${live.note} Policy ${receipt.attestation.policyFingerprint} still ran outside the model. No transaction hash exists because nothing was broadcast.`,
      };
    } else {
      receipt.attestation.statement = `Allowed by the local policy gate (${receipt.attestation.policyFingerprint}), not a TEE attestation. ${formatUsd(request.amountUsd)} USDC would settle on ${request.chain} via NEAR Intents 1-Click. Nothing was broadcast.`;
    }
    pushLedger(current, receipt);
    return receipt;
  }
  const receipt = receiptBase(current, request, ignoredFields, decision, id);
  if (decision.status === "needs_approval") {
    receipt.settlement = settlementFor(request, null);
    current.pending = [{ receipt, request }, ...current.pending.filter((item) => item.receipt.id !== id)];
  }
  pushLedger(current, receipt);
  return receipt;
}

export function submitPayment(input: unknown): Promise<GateReceipt> {
  return enqueue(async () => {
    const { request, ignoredFields, idempotencyKey } = parsePayment(input);
    const current = state();
    if (idempotencyKey) {
      const prior = current.idempotency.get(idempotencyKey);
      const existing = prior ? current.ledger.find((item) => item.id === prior) : undefined;
      if (existing) return existing;
    }
    const receipt = await decide(request, ignoredFields, true, randomUUID());
    if (idempotencyKey) current.idempotency.set(idempotencyKey, receipt.id);
    return receipt;
  });
}

export function resolveApproval(id: string, action: "approve" | "reject"): Promise<GateReceipt> {
  return enqueue(async () => {
    const current = state();
    const index = current.pending.findIndex((item) => item.receipt.id === id);
    const pending = index >= 0 ? current.pending[index] : undefined;
    if (!pending) throw new Error("That approval is no longer pending.");
    current.pending.splice(index, 1);
    if (action === "reject") {
      const receipt: GateReceipt = {
        ...pending.receipt,
        id: randomUUID(),
        at: new Date().toISOString(),
        status: "cancelled",
        rule: "human_reject",
        detail: "A human rejected this payment. Nothing was signed.",
        settlement: null,
        remainingDailyUsd: fromCents(remainingCents(current)),
        spentUsd: fromCents(current.spentCents),
        balanceUsd: fromCents(current.balanceCents),
      };
      pushLedger(current, receipt);
      return receipt;
    }
    return decide(pending.request, pending.receipt.ignoredFields, false, randomUUID());
  });
}
