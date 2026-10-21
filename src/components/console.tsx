import { useEffect, useRef, useState } from "react";

import { agentBeats, type AgentBeat } from "@/lib/agent-script";
import { addFunds, decideApproval, getGate, prepareDemoGate, requestPayment, savePolicy } from "@/lib/gate.functions";
import type { GateReceipt, Snapshot } from "@/lib/gate-types";
import {
  CHAINS,
  DEMO_POLICY,
  enclaveDocument,
  formatUsd,
  type HumanPolicy,
} from "@/lib/policy";

const fieldClass =
  "h-11 w-full rounded-control border border-border bg-bg px-3 text-fg outline-none placeholder:text-subtle";

const labelClass = "mb-1.5 block text-sm font-medium text-muted";

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The gate could not complete that request.";
}

function statusLabel(status: GateReceipt["status"]): string {
  if (status === "allow") return "Allowed";
  if (status === "reject") return "Blocked";
  if (status === "needs_approval") return "Needs approval";
  return "Cancelled";
}

function statusClass(status: GateReceipt["status"]): string {
  if (status === "allow") return "bg-allow-bg text-allow";
  if (status === "needs_approval") return "bg-hold-bg text-hold";
  if (status === "cancelled") return "bg-elevated text-muted";
  return "bg-deny-bg text-deny";
}

function PolicySummary({ policy }: { policy: HumanPolicy }) {
  return (
    <p className="text-sm text-muted">
      ≤ {formatUsd(policy.maxPerTransactionUsd)} / tx · {formatUsd(policy.dailyLimitUsd)} / day · approve
      above {formatUsd(policy.approvalThresholdUsd)} · {policy.allowedRecipients.length} recipients ·{" "}
      {policy.frozen ? "frozen" : "active"}
    </p>
  );
}

function ReceiptSlip({ receipt }: { receipt: GateReceipt }) {
  const when = new Date(receipt.at);
  const time = Number.isNaN(when.getTime())
    ? receipt.at
    : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <article className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-medium tabular-nums">
            {formatUsd(receipt.request.amountUsd)}{" "}
            <span className="text-muted">{receipt.request.asset.toUpperCase()}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            to {receipt.request.to} · {receipt.request.chain}
            {receipt.request.purpose ? ` · ${receipt.request.purpose}` : ""}
          </p>
        </div>
        <span className={`rounded-control px-2.5 py-1 text-sm font-medium ${statusClass(receipt.status)}`}>
          {statusLabel(receipt.status)}
          {receipt.rule ? ` · ${receipt.rule}` : ""}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6">{receipt.detail}</p>
      {receipt.ignoredFields.length > 0 && (
        <p className="mt-2 text-sm text-hold">
          Ignored fields the agent tried to send: {receipt.ignoredFields.join(", ")}. They did not change
          the decision.
        </p>
      )}
      <p className="mt-3 text-sm text-muted">{receipt.attestation.statement}</p>
      {receipt.settlement && (
        <div className="mt-4 border-t border-border pt-4">
          <p
            className={`px-3 py-2 text-sm font-medium ${
              receipt.attestation.kind === "outlayer-dry-run"
                ? "bg-allow-bg text-allow"
                : "bg-elevated text-fg"
            }`}
          >
            {receipt.attestation.kind === "outlayer-dry-run"
              ? "OutLayer dry-run would succeed. Not a broadcast."
              : "Local policy gate. Not a TEE attestation. Not a broadcast."}
          </p>
          <p className="mt-3 font-mono text-xs leading-5 text-muted">
            NEAR intents · {receipt.settlement.amountUnits} units of {receipt.settlement.token}
            <br />
            {receipt.settlement.sourceChain} → {receipt.settlement.destinationChain} · {receipt.settlement.recipient}
            <br />
            submitted {String(receipt.settlement.submitted)}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-subtle">
            {receipt.settlement.calls.map((call) => (
              <li key={call}>{call}</li>
            ))}
          </ul>
          {receipt.settlement.live && (
            <p className="mt-2 text-sm text-muted">{receipt.settlement.live.note}</p>
          )}
        </div>
      )}
      <p className="mt-4 font-mono text-xs text-subtle">
        {time} · remaining {formatUsd(receipt.remainingDailyUsd)} · fingerprint{" "}
        {receipt.attestation.policyFingerprint}
      </p>
    </article>
  );
}

export function Console() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<HumanPolicy>(DEMO_POLICY);
  const [recipientsText, setRecipientsText] = useState(DEMO_POLICY.allowedRecipients.join("\n"));
  const [amount, setAmount] = useState("8");
  const [to, setTo] = useState("vendor.near");
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("base");
  const [purpose, setPurpose] = useState("API invoice 14");
  const [fundAmount, setFundAmount] = useState("50");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<Array<{ beat: AgentBeat; receipt: GateReceipt }>>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const revision = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    const ticket = ++revision.current;
    let cancelled = false;
    getGate()
      .then((gate) => {
        if (cancelled || ticket !== revision.current) return;
        setSnap(gate);
        if (gate.policy) {
          setDraft(gate.policy);
          setRecipientsText(gate.policy.allowedRecipients.join("\n"));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && ticket === revision.current) setLoadError(messageOf(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(task: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    const ticket = ++revision.current;
    setBusy(true);
    setFormError(null);
    try {
      await task();
      if (ticket !== revision.current) return;
    } catch (error) {
      if (ticket === revision.current) setFormError(messageOf(error));
    } finally {
      inFlight.current = false;
      if (ticket === revision.current) setBusy(false);
    }
  }

  function draftFromText(): HumanPolicy {
    return {
      ...draft,
      allowedRecipients: recipientsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }

  async function save(next: HumanPolicy = draftFromText()) {
    const gate = await savePolicy({ data: next });
    setDraft(gate.policy ?? next);
    setRecipientsText((gate.policy ?? next).allowedRecipients.join("\n"));
    setSnap(gate);
  }

  async function prepare() {
    const gate = await prepareDemoGate({ data: DEMO_POLICY });
    setSnap(gate);
    setDraft(DEMO_POLICY);
    setRecipientsText(DEMO_POLICY.allowedRecipients.join("\n"));
  }

  async function pay(body: Record<string, unknown>) {
    const result = await requestPayment({ data: body });
    setSnap(result.gate);
    setFocusId(result.receipt.id);
  }

  async function postAsAgent(body: Record<string, unknown>): Promise<GateReceipt> {
    const response = await fetch("/api/v1/pay", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { receipt?: GateReceipt; detail?: string };
    if (!response.ok || !payload.receipt) {
      throw new Error(payload.detail || "The pay route refused that body.");
    }
    const gate = await getGate();
    setSnap(gate);
    setFocusId(payload.receipt.id);
    return payload.receipt;
  }

  async function runAgent() {
    await prepare();
    setSpoken([]);
    const beats = agentBeats(crypto.randomUUID().slice(0, 8));
    for (const beat of beats) {
      setSpeaking(beat.says);
      const receipt = await postAsAgent(beat.body);
      setSpoken((current) => [...current, { beat, receipt }]);
      setSpeaking(null);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  async function submitCurrent(extra?: Record<string, unknown>) {
    const amountUsd = Number(amount);
    await pay({
      amountUsd,
      asset: "USDC",
      to,
      chain,
      purpose,
      ...extra,
    });
  }

  const focused = snap?.ledger.find((item) => item.id === focusId) ?? snap?.ledger[0] ?? null;
  const saved = snap?.policy;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <header className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
        <div className="max-w-xl">
          <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">Watch the agent ask.</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            You set the caps. The agent only calls the pay route. This mandate lives in this process. A restart
            forgets it. Nothing here is broadcast.
          </p>
        </div>
        <div className="border border-border bg-surface px-5 py-4">
          <p className="text-sm text-muted">Remaining today</p>
          <p className="mt-1 font-mono text-3xl font-medium tabular-nums">
            {snap?.remainingDailyUsd == null ? "—" : formatUsd(snap.remainingDailyUsd)}
          </p>
          <p className="mt-1 text-sm text-subtle">
            Balance {formatUsd(snap?.balanceUsd ?? 0)}
            {snap?.liveKey ? " · dry-run on allow" : " · dry-run not called"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {snap?.liveKey
              ? "An allow asks OutLayer for a dry-run. would_succeed must be true, or nothing is spent."
              : "No OutLayer key in this process. An allow is the local gate, not a TEE attestation."}
          </p>
          {snap && snap.pending.length > 0 && (
            <p className="mt-2 text-sm text-fg">
              {snap.pending.length} waiting. Remaining includes that hold. Balance has not moved.
            </p>
          )}
        </div>
      </header>

      {loadError && (
        <p className="mt-4 rounded-control bg-deny-bg px-3 py-2 text-sm text-deny" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-card border border-border bg-surface p-5">
          <h2 className="text-lg font-medium">Policy</h2>
          <p className="mt-1 text-sm text-muted">Saved by you. The agent request cannot edit these fields.</p>
          {saved ? (
            <div className="mt-3">
              <PolicySummary policy={saved} />
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Document the enclave would store</summary>
                <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all bg-bg p-3 font-mono text-xs leading-5 text-muted">
                  {JSON.stringify(enclaveDocument(saved), null, 2)}
                </pre>
                <p className="mt-2 text-sm text-muted">
                  Same caps. Evaluated in process memory. This block is not an attestation.
                </p>
              </details>
            </div>
          ) : (
            <p className="mt-3 text-sm text-hold">No policy published yet. Payments will refuse.</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="col-span-1">
              <span className={labelClass}>Max / tx (USD)</span>
              <input
                className={fieldClass}
                inputMode="decimal"
                value={draft.maxPerTransactionUsd}
                onChange={(event) =>
                  setDraft({ ...draft, maxPerTransactionUsd: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span className={labelClass}>Daily limit</span>
              <input
                className={fieldClass}
                inputMode="decimal"
                value={draft.dailyLimitUsd}
                onChange={(event) => setDraft({ ...draft, dailyLimitUsd: Number(event.target.value) })}
              />
            </label>
            <label className="col-span-2">
              <span className={labelClass}>Approval above</span>
              <input
                className={fieldClass}
                inputMode="decimal"
                value={draft.approvalThresholdUsd}
                onChange={(event) =>
                  setDraft({ ...draft, approvalThresholdUsd: Number(event.target.value) })
                }
              />
            </label>
            <label className="col-span-2">
              <span className={labelClass}>Allow-list, one recipient per line</span>
              <textarea
                className="min-h-28 w-full max-w-full rounded-control border border-border bg-bg px-3 py-2 font-mono text-sm text-fg"
                value={recipientsText}
                onChange={(event) => setRecipientsText(event.target.value)}
              />
            </label>
          </div>

          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={draft.frozen}
              onChange={(event) => setDraft({ ...draft, frozen: event.target.checked })}
            />
            Freeze wallet
          </label>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              className="h-11 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              onClick={() => run(() => save())}
            >
              Save policy
            </button>
            <button
              type="button"
              disabled={busy}
              className="h-11 rounded-control border border-border px-4 text-sm font-medium transition-colors duration-150 hover:border-fg disabled:opacity-50"
              onClick={() => run(prepare)}
            >
              Prepare demo · $50/day · $200 USDC
            </button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Fund demo balance</h3>
            <div className="mt-2 flex gap-2">
              <input
                className={fieldClass}
                inputMode="decimal"
                aria-label="Amount to add"
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                className="h-11 shrink-0 rounded-control border border-border px-4 text-sm font-medium transition-colors duration-150 hover:border-fg disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    const gate = await addFunds({ data: { amountUsd: Number(fundAmount), mode: "add" } });
                    setSnap(gate);
                  })
                }
              >
                Add
              </button>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="rounded-card border border-border bg-elevated p-5">
            <h2 className="text-lg font-medium">The agent</h2>
            <p className="mt-1 text-sm text-muted">
              Four asks, posted to <span className="font-mono text-fg">POST /api/v1/pay</span>. You do not type
              them. The $18 hold waits for you after the run.
            </p>
            <button
              type="button"
              disabled={busy}
              className="mt-4 h-11 w-full rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              onClick={() => run(runAgent)}
            >
              {busy && speaking ? "Agent is asking…" : "Run the agent"}
            </button>
            <ol className="mt-4 flex flex-col gap-3" aria-live="polite">
              {agentBeats("plan").map((beat) => {
                const done = spoken.find((item) => item.beat.id === beat.id);
                return (
                  <li key={beat.id} className="border border-border bg-surface p-3">
                    <p className="text-sm font-medium">{beat.title}</p>
                    <p className="mt-1 text-sm text-muted">{done ? done.beat.says : beat.says}</p>
                    {done ? (
                      <p className="mt-2 text-sm">
                        <span className={`rounded-control px-2 py-0.5 font-medium ${statusClass(done.receipt.status)}`}>
                          {statusLabel(done.receipt.status)}
                          {done.receipt.rule ? ` · ${done.receipt.rule}` : ""}
                        </span>
                        {done.receipt.status === "allow" && (
                          <span className="ml-2 text-muted">
                            {done.receipt.attestation.kind === "outlayer-dry-run"
                              ? "· dry-run would succeed · not broadcast"
                              : "· local gate · not a TEE · not broadcast"}
                          </span>
                        )}
                        {done.receipt.ignoredFields.length > 0 && (
                          <span className="ml-2 text-hold">· ignored {done.receipt.ignoredFields.join(", ")}</span>
                        )}
                        {done.receipt.settlement && (
                          <span className="ml-2 font-mono text-xs text-subtle">
                            · submitted {String(done.receipt.settlement.submitted)}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-2 font-mono text-xs text-subtle">waiting</p>
                    )}
                  </li>
                );
              })}
            </ol>
            {speaking && <p className="mt-3 text-sm text-fg">{speaking}</p>}
            {formError && (
              <p className="mt-3 text-sm text-deny" role="alert">
                {formError}
              </p>
            )}
          </div>

          <div className="rounded-card border border-border bg-surface p-5">
            <h2 className="text-lg font-medium">Or ask once</h2>
            <p className="mt-1 text-sm text-muted">A single payment, still through the same gate. Extra fields are discarded.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Amount (USDC)</span>
                <input className={fieldClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label>
                <span className={labelClass}>Destination chain</span>
                <select
                  className={fieldClass}
                  value={chain}
                  onChange={(e) => setChain(e.target.value as (typeof CHAINS)[number])}
                >
                  {CHAINS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Recipient</span>
                <input className={`${fieldClass} font-mono`} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Purpose</span>
                <input className={fieldClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              </label>
            </div>

            <button
              type="button"
              disabled={busy}
              className="mt-4 h-11 w-full rounded-control border border-border px-4 text-sm font-medium transition-colors duration-150 hover:border-fg disabled:opacity-50"
              onClick={() => run(() => submitCurrent())}
            >
              Request this payment
            </button>
          </div>

          <div aria-live="polite">
            {focused ? (
              <ReceiptSlip receipt={focused} />
            ) : (
              <p className="rounded-card border border-dashed border-border px-5 py-8 text-sm text-muted">
                No receipt yet. Run the agent. The $8 allow should say submitted false.
              </p>
            )}
          </div>
        </section>
      </div>

      {snap && snap.pending.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-medium">Waiting on you</h2>
          <p className="mt-1 text-sm text-muted">The agent cannot press these. Balance has not moved.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {snap.pending.map((item) => (
              <li key={item.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono tabular-nums">
                      {formatUsd(item.request.amountUsd)} to {item.request.to}
                    </p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="h-11 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
                      onClick={() =>
                        run(async () => {
                          const result = await decideApproval({ data: { id: item.id, action: "approve" } });
                          setSnap(result.gate);
                          setFocusId(result.receipt.id);
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="h-11 rounded-control border border-border px-4 text-sm font-medium transition-colors duration-150 hover:border-fg disabled:opacity-50"
                      onClick={() =>
                        run(async () => {
                          const result = await decideApproval({ data: { id: item.id, action: "reject" } });
                          setSnap(result.gate);
                          setFocusId(result.receipt.id);
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Ledger</h2>
        <p className="mt-1 text-sm text-muted">Every decision, newest first. Blocks do not spend the daily limit.</p>
        {snap && snap.ledger.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {snap.ledger.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setFocusId(item.id)}
                  className="flex w-full flex-col gap-1 rounded-card border border-border bg-surface px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-mono text-sm tabular-nums">
                    {formatUsd(item.request.amountUsd)} → {item.request.to}
                  </span>
                  <span className="text-sm text-muted">
                    {statusLabel(item.status)}
                    {item.rule ? ` · ${item.rule}` : ""} · {item.request.chain}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-subtle">The ledger is empty.</p>
        )}
      </section>
    </main>
  );
}
