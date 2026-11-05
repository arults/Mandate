import { createHash, randomUUID } from "node:crypto";

import type { DemoBeatLeg, DemoReplay, GateReceipt, Settlement, Snapshot } from "@/lib/gate-types";
import {
  clearPersistedState,
  durabilityMode,
  isGateHydrated,
  loadPersistedState,
  markGateHydrated,
  markGateUnhydrated,
  resetPersistForTests,
  savePersistedState,
  type PersistedState,
} from "@/lib/gate-persist.server";
import { fetchOneClickQuote, ONECLICK_QUOTE_URL } from "@/lib/oneclick-quote.server";
import {
  TRAVEL_BURST_MAX_LEGS,
  beatsForScript,
  type AgentBeat,
  type AgentScript,
} from "@/lib/agent-script";
import {
  cents,
  evaluatePolicy,
  formatUsd,
  fromCents,
  normalizeRecipient,
  parsePayment,
  parsePolicy,
  TRAVEL_DEMO_BALANCE_USD,
  usdToUsdcUnits,
  type HumanPolicy,
  type PaymentRequest,
} from "@/lib/policy";
import { projectReceipt, type PublicGateReceipt } from "@/lib/privacy";

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

function serializeState(current: State): PersistedState {
  return {
    policy: current.policy,
    day: current.day,
    spentCents: current.spentCents,
    balanceCents: current.balanceCents,
    pending: current.pending,
    ledger: current.ledger,
    idempotency: [...current.idempotency.entries()],
  };
}

function ensurePrivacyMode(policy: HumanPolicy | null): HumanPolicy | null {
  if (!policy) return null;
  return {
    ...policy,
    privacyMode: policy.privacyMode === "full" ? "full" : "minimize",
  };
}

function applyPersisted(raw: PersistedState): State {
  return {
    policy: ensurePrivacyMode(raw.policy),
    day: raw.day,
    spentCents: raw.spentCents,
    balanceCents: raw.balanceCents,
    pending: raw.pending ?? [],
    ledger: raw.ledger ?? [],
    idempotency: new Map(raw.idempotency ?? []),
  };
}

async function persist(current: State): Promise<void> {
  if (durabilityMode() === "process-memory") return;
  await savePersistedState(serializeState(current));
}

async function ensureHydrated(): Promise<void> {
  if (durabilityMode() === "process-memory") {
    markGateHydrated();
    return;
  }
  if (isGateHydrated() && g.__ledgerGate) return;
  const loaded = await loadPersistedState();
  if (loaded) {
    g.__ledgerGate = applyPersisted(loaded);
  } else if (!g.__ledgerGate) {
    g.__ledgerGate = blankState();
  }
  markGateHydrated();
}

export async function resetGateForTests() {
  g.__ledgerGate = undefined;
  queue = Promise.resolve();
  clock = () => new Date();
  markGateUnhydrated();
  process.env.MANDATE_PGDATA_MEMORY = "1";
  process.env.MANDATE_1CLICK_QUOTE = "0";
  if (!process.env.MANDATE_DURABILITY) process.env.MANDATE_DURABILITY = "local-db";
  await clearPersistedState().catch(() => undefined);
  markGateHydrated();
  g.__ledgerGate = blankState();
}

/** Clear process memory only; next ensureHydrated reloads from local-db. */
export async function forgetGateMemoryForTests() {
  g.__ledgerGate = undefined;
  markGateUnhydrated();
  queue = Promise.resolve();
}

export async function hardResetPersistForTests() {
  await resetPersistForTests();
  g.__ledgerGate = undefined;
  markGateUnhydrated();
  queue = Promise.resolve();
}

export function setGateClockForTests(next: () => Date) {
  clock = next;
}

function today(): string {
  return clock().toISOString().slice(0, 10);
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
      "The day changed before you answered. The ask was dropped. Money was not sent.",
    );
  }
  return current;
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(
    async () => {
      await ensureHydrated();
      return fn();
    },
    async () => {
      await ensureHydrated();
      return fn();
    },
  );
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
    privacyMode: policy.privacyMode === "full" ? "full" : "minimize",
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

function snapshotOf(current: State): Snapshot {
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
    durability: durabilityMode(),
    liveKey: Boolean(process.env.OUTLAYER_API_KEY),
  };
}

/** Sync view of in-memory gate. Prefer after an awaited gate mutation, or call awaitGateReady(). */
export function snapshot(): Snapshot {
  return snapshotOf(state());
}

export async function awaitGateReady(): Promise<Snapshot> {
  return enqueue(async () => snapshotOf(state()));
}

function pushLedger(current: State, receipt: GateReceipt) {
  current.ledger = [receipt, ...current.ledger.filter((item) => item.id !== receipt.id)].slice(
    0,
    40,
  );
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

function settlementFor(
  request: PaymentRequest,
  live: Settlement["live"],
  quote: Settlement["quote"],
): Settlement {
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
      `POST ${ONECLICK_QUOTE_URL}`,
      "POST https://api.outlayer.ai/wallet/v1/intents/withdraw",
    ],
    live,
    quote,
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
    else if (res.status >= 200 && res.status < 300 && record?.would_succeed === true)
      verdict = "ok";
    else if (res.status >= 200 && res.status < 300 && record?.would_succeed !== false)
      verdict = "retry";
    else verdict = "refused";
    const note =
      verdict === "ok"
        ? "Practice check would pass. Money was not sent."
        : verdict === "retry"
          ? `Practice check could not be judged (${res.status}). ${message}`
          : `Practice check said no${reason ? ` (${reason})` : ""}. Money was not sent. ${message}`;
    return { httpStatus: res.status, note, verdict };
  } catch (error) {
    const message = error instanceof Error ? error.message : "dry-run failed";
    return {
      httpStatus: 0,
      note: `Practice check did not finish. ${message}`,
      verdict: "retry",
    };
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
      statement: `Your saved rules (${fp}) were checked in this demo, outside the helper. The request could not mark itself approved, raise a limit, or send money.`,
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
    if (next.frozen)
      cancelPending(
        current,
        "frozen",
        "The desk was frozen in this demo. Waiting asks were dropped. Money was not sent.",
      );
    await persist(current);
    return snapshotOf(current);
  });
}

export function prepareDemo(input: unknown, balanceUsd = 200): Promise<Snapshot> {
  return enqueue(async () => {
    const current = state();
    current.policy = parsePolicy(input);
    current.balanceCents = cents(balanceUsd);
    current.spentCents = 0;
    current.pending = [];
    current.ledger = [];
    current.idempotency = new Map();
    current.day = today();
    await persist(current);
    return snapshotOf(current);
  });
}

const RECEIPT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Look up a stored receipt by id (ledger or pending). Null if unknown / malformed. */
export async function getReceiptById(id: string): Promise<GateReceipt | null> {
  if (!id || typeof id !== "string" || id.length > 80 || !RECEIPT_ID_RE.test(id)) return null;
  return enqueue(async () => {
    const current = state();
    const fromLedger = current.ledger.find((item) => item.id === id);
    if (fromLedger) return fromLedger;
    const fromPending = current.pending.find((item) => item.receipt.id === id);
    return fromPending ? fromPending.receipt : null;
  });
}

export function fundWallet(amountUsd: number, mode: "add" | "set" = "add"): Promise<Snapshot> {
  return enqueue(async () => {
    const current = state();
    const next = cents(amountUsd);
    current.balanceCents = mode === "set" ? next : current.balanceCents + next;
    await persist(current);
    return snapshotOf(current);
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
    throw new Error("No policy is published. Save the rules before the helper can ask.");
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
          detail: "The day changed while this was being checked. Nothing was set aside. Money was not sent.",
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
            ? "Your rules would have allowed this, but the practice check did not finish. Nothing was set aside. Try again. Money was not sent."
            : `Your rules would have allowed this, but the practice check said no. Nothing was set aside. Money was not sent. ${live.note}`,
        },
        id,
      );
      pushLedger(current, receipt);
      return { receipt, remember: !unconfirmed };
    }
    current.spentCents += cents(request.amountUsd);
    current.balanceCents -= cents(request.amountUsd);
    const quote = await fetchOneClickQuote(request);
    const receipt = receiptBase(current, request, ignoredFields, decision, id);
    receipt.remainingDailyUsd = fromCents(remainingCents(current));
    receipt.spentUsd = fromCents(current.spentCents);
    receipt.balanceUsd = fromCents(current.balanceCents);
    receipt.settlement = settlementFor(request, live, quote);
    if (live && live.verdict === "ok") {
      receipt.attestation = {
        kind: "outlayer-dry-run",
        policyFingerprint: receipt.attestation.policyFingerprint,
        statement: `${live.note} Your saved rules (${receipt.attestation.policyFingerprint}) still decided. Money was not sent, so there is no payment record.`,
      };
    } else {
      receipt.attestation.statement = `Allowed by your saved rules (${receipt.attestation.policyFingerprint}). ${formatUsd(request.amountUsd)} in demo dollars (USDC) fits. A NEAR demo quote may be attached. Money was not sent.`;
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
        detail:
          "Too many asks are waiting for you. This one was not queued. Money was not sent.",
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
          throw new Error("Conflict: that same request was already used for a different payment.");
        }
        return prior.receipt;
      }
      if (current.idempotency.size >= MAX_IDEMPOTENCY) {
        throw new Error("Conflict: too many saved requests, so this one was not run.");
      }
    }
    const outcome = await decide(request, ignoredFields, true, randomUUID(), idempotencyKey);
    if (idempotencyKey && outcome.remember) {
      state().idempotency.set(idempotencyKey, { hash, receipt: outcome.receipt });
    }
    await persist(state());
    return outcome.receipt;
  });
}

export function resolveApproval(id: string, action: "approve" | "reject"): Promise<GateReceipt> {
  return enqueue(async () => {
    const current = state();
    const index = current.pending.findIndex((item) => item.receipt.id === id);
    const pending = index >= 0 ? current.pending[index] : undefined;
    if (!pending) throw new Error("That ask is no longer waiting for you.");
    current.pending.splice(index, 1);
    release(current, pending);
    if (action === "reject") {
      const receipt: GateReceipt = {
        ...pending.receipt,
        id: randomUUID(),
        at: clock().toISOString(),
        status: "cancelled",
        rule: "human_reject",
        detail: "You said no. Money was not sent.",
        settlement: null,
        remainingDailyUsd: fromCents(remainingCents(current)),
        spentUsd: fromCents(current.spentCents),
        balanceUsd: fromCents(current.balanceCents),
      };
      retarget(current, pending.receipt.id, receipt);
      dropLedgerRow(current, pending.receipt.id);
      pushLedger(current, receipt);
      await persist(current);
      return receipt;
    }
    dropLedgerRow(current, pending.receipt.id);
    const outcome = await decide(
      pending.request,
      pending.receipt.ignoredFields,
      false,
      randomUUID(),
      null,
    );
    if (outcome.receipt.rule === "settlement_unconfirmed") {
      dropLedgerRow(current, outcome.receipt.id);
      current.spentCents += pending.reservedCents;
      current.pending = [
        pending,
        ...current.pending.filter((item) => item.receipt.id !== pending.receipt.id),
      ];
      pushLedger(current, pending.receipt);
      await persist(current);
      return outcome.receipt;
    }
    retarget(current, pending.receipt.id, outcome.receipt);
    await persist(current);
    return outcome.receipt;
  });
}

export type DemoAgentResult = {
  beat: AgentBeat;
  /** Decisive receipt. For a burst, this is the leg the day (or another rule) stopped. */
  receipt: PublicGateReceipt;
  legs: DemoBeatLeg[];
  /** Present when this ask was submitted twice with the same payment key. */
  replay: DemoReplay | null;
};

function toLeg(full: GateReceipt): DemoBeatLeg {
  return {
    id: full.id,
    amountUsd: full.request.amountUsd,
    to: full.request.to,
    status: full.status,
    rule: full.rule,
    detail: full.detail,
  };
}

/**
 * A burst is several payments of the same ride. Each leg gets its own
 * idempotency key. Stop at the first block so a full day does not keep asking.
 */
async function submitBurst(beat: AgentBeat): Promise<GateReceipt[]> {
  const legs: GateReceipt[] = [];
  const rawKey = beat.body.idempotencyKey;
  const baseKey = typeof rawKey === "string" && rawKey.trim() ? rawKey.trim() : "burst";
  for (let i = 1; i <= TRAVEL_BURST_MAX_LEGS; i++) {
    const full = await submitPayment({ ...beat.body, idempotencyKey: `${baseKey}-${i}` });
    legs.push(full);
    if (full.status === "reject") return legs;
  }
  return legs;
}

/**
 * Prepare + the scripted asks in ONE process.
 * Console uses this so Vercel serverless does not lose in-memory PGLite policy
 * between prepareDemoGate and a separate /api/v1/pay isolate.
 * /api/v1/pay remains the agent contract for curl / external agents.
 */
export async function runDemoAgentFlow(
  policyInput: unknown,
  runId: string,
  script: AgentScript = "demo",
  onlyBeat?: AgentBeat["id"],
): Promise<{ gate: Snapshot; receipts: PublicGateReceipt[]; results: DemoAgentResult[] }> {
  await prepareDemo(policyInput, script === "travel" ? TRAVEL_DEMO_BALANCE_USD : 200);
  const beats = beatsForScript(script, runId).filter((beat) => !onlyBeat || beat.id === onlyBeat);
  if (beats.length === 0) throw new Error("That ask is not part of this trip.");
  const results: DemoAgentResult[] = [];
  for (const beat of beats) {
    const fullLegs =
      beat.id === "burst" ? await submitBurst(beat) : [await submitPayment(beat.body)];
    const decisive = fullLegs[fullLegs.length - 1]!;
    let replay: DemoReplay | null = null;
    if (script === "travel" && beat.id === "allow") {
      const again = await submitPayment(beat.body);
      if (again.id === decisive.id) replay = { sameReceipt: true, receiptId: again.id };
    }
    const receipt = projectReceipt(decisive, snapshot().policy, "agent");
    results.push({ beat, receipt, legs: fullLegs.map(toLeg), replay });
  }
  return {
    gate: snapshot(),
    receipts: results.map((item) => item.receipt),
    results,
  };
}
