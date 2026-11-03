import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MerchantMark } from "@/components/merchant-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

import { agentBeats, travelAgentBeats, type AgentBeat, type AgentScript } from "@/lib/agent-script";
import {
  addFunds,
  decideApproval,
  freezeDesk,
  getGate,
  prepareDemoGate,
  requestPayment,
  runDemoAgent,
  savePolicy,
} from "@/lib/gate.functions";
import type { DemoBeatLeg, DemoReplay, GateReceipt, Settlement, Snapshot } from "@/lib/gate-types";
import { copyableDryQuoteId, intentsOptics } from "@/lib/intents-optics";
import { merchantOf, merchantTextClass, type MerchantId } from "@/lib/merchants";
import {
  CHAINS,
  DEMO_POLICY,
  TRAVEL_DEMO_BALANCE_USD,
  TRAVEL_POLICY,
  enclaveDocument,
  formatUsd,
  type HumanPolicy,
} from "@/lib/policy";
import type { PublicGateReceipt } from "@/lib/privacy";

/** Server-fn safe beat view (body omitted — not TanStack-serializable as Record<string, unknown>). */
type DemoBeatView = Pick<AgentBeat, "id" | "title" | "says">;

type SpokenAsk = {
  beat: DemoBeatView;
  receipt: PublicGateReceipt | GateReceipt;
  legs: DemoBeatLeg[];
  replay: DemoReplay | null;
};

const fieldClass =
  "h-11 w-full rounded-control border border-border bg-bg px-3 text-fg outline-none placeholder:text-subtle";

const labelClass = "mb-1.5 block text-sm font-medium text-muted";
const helpClass = "mt-1.5 text-xs leading-5 text-subtle";
/** Flip when public/demo/console-walkthrough.mp4 is committed. */
const HAS_CONSOLE_DEMO_VIDEO = true;

const primaryBtn =
  "h-11 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50";
const quietBtn =
  "h-11 rounded-control border border-border bg-surface px-4 text-sm font-medium transition-colors duration-150 hover:border-fg disabled:opacity-50";

function scrollBeatId(
  items: Array<{ beat: { id: string }; receipt: { id: string } }>,
  pending: Array<{ id: string }> | undefined,
  isBusy: boolean,
): string | null {
  if (isBusy || items.length === 0) return null;
  const waiting = items.find((item) => pending?.some((entry) => entry.id === item.receipt.id));
  return (
    waiting?.beat.id ??
    items.find((item) => item.beat.id === "burst")?.beat.id ??
    items.find((item) => item.beat.id === "poison")?.beat.id ??
    items[items.length - 1]?.beat.id ??
    null
  );
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The gate could not complete that request.";
}

function statusLabel(status: GateReceipt["status"]): string {
  if (status === "allow") return "Allowed";
  if (status === "reject") return "Blocked";
  if (status === "needs_approval") return "On hold";
  return "Cancelled";
}

const SCENARIOS = [
  { id: "allow", label: "Allow", hint: "$80", merchant: "hotel" },
  { id: "hold", label: "Hold", hint: "$250", merchant: "airline" },
  { id: "block", label: "Cap", hint: "$500", merchant: "hotel" },
  { id: "poison", label: "Look-alike", hint: "", merchant: "hotel" },
  { id: "burst", label: "Burst", hint: "", merchant: "rides" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  hint: string;
  merchant: MerchantId;
}>;

async function copyProofId(id: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(id);
      return;
    } catch {
      // Fall through to the selection copy when the clipboard is blocked.
    }
  }
  const area = document.createElement("textarea");
  area.value = id;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

/** Click or select-copy a real dry-quote id. The href is only that id, not a transaction. */
function DryQuoteProof({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <a
        href={`#${encodeURIComponent(id)}`}
        className="break-all underline decoration-border underline-offset-2 hover:decoration-current"
        aria-label={`Copy dry quote id ${id}. Not a transaction.`}
        title="Copy dry quote id. Not a transaction hash."
        onClick={(event) => {
          event.preventDefault();
          void copyProofId(id)
            .then(() => {
              setCopied(true);
              if (timer.current !== null) window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setCopied(false), 1600);
            })
            .catch(() => {
              setCopied(false);
            });
        }}
      >
        {id}
      </a>
      {copied ? (
        <span className="ml-1 font-sans text-subtle" aria-live="polite">
          copied
        </span>
      ) : null}
    </>
  );
}

function IntentsHonesty({
  settlement,
  tone = "muted",
}: {
  settlement: Settlement | null | undefined;
  tone?: "muted" | "fg";
}) {
  const lines = settlement ? intentsOptics(settlement) : null;
  const quoteId = copyableDryQuoteId(lines);
  return (
    <p className={`mt-1 font-mono text-xs leading-5 ${tone === "fg" ? "text-fg" : "text-muted"}`}>
      NEAR Intents ·{" "}
      {quoteId ? (
        <>
          dry quote <DryQuoteProof id={quoteId} />
        </>
      ) : (
        "dry quote not attached"
      )}
      {" · submitted false · tx hash none"}
    </p>
  );
}

function IntentsReceipt({ settlement }: { settlement: Settlement }) {
  const lines = intentsOptics(settlement);
  if (!lines) return null;
  const quoteId = copyableDryQuoteId(lines);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="text-sm font-medium text-fg">NEAR Intents · dry quote</p>
      <IntentsHonesty settlement={settlement} tone="fg" />
      <dl className="mt-1.5 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5 font-mono text-xs leading-4">
        <dt className="text-subtle">submitted</dt>
        <dd className="text-fg">{lines.submitted}</dd>
        <dt className="text-subtle">path</dt>
        <dd className="text-fg">{lines.path}</dd>
        <dt className="text-subtle">dry quote</dt>
        <dd className="min-w-0 break-all text-fg">
          {quoteId ? <DryQuoteProof id={quoteId} /> : lines.dryQuote}
        </dd>
        {lines.out && (
          <>
            <dt className="text-subtle">out</dt>
            <dd className="text-fg">{lines.out}</dd>
          </>
        )}
        <dt className="text-subtle">tx hash</dt>
        <dd className="text-fg">{lines.txHash}</dd>
      </dl>
    </div>
  );
}

function markedPayee(value: string, other: string, tone: "deny" | "allow") {
  const twin = [...other];
  return [...value].map((char, index) => {
    if (char === twin[index]) return <span key={`${char}-${index}`}>{char}</span>;
    const mark =
      tone === "deny"
        ? "bg-surface px-0.5 font-medium text-deny"
        : "bg-allow-bg px-0.5 font-medium text-allow";
    return (
      <span key={`${char}-${index}`} className={mark}>
        {char}
      </span>
    );
  });
}

/** Asked payee beside the allow-list name, with the swapped character marked. */
function WhoAsked({
  asked,
  listed,
  blocked,
}: {
  asked: string;
  listed: string;
  blocked: boolean;
}) {
  const oneForL = asked.includes("1") && listed.includes("l");
  return (
    <div className="mt-2">
      {blocked && (
        <p>
          <span className="inline-flex rounded-control bg-surface px-2 py-0.5 text-sm font-medium text-deny">
            Look-alike · not on allow-list
          </span>
        </p>
      )}
      <div
        className="mt-2 grid grid-cols-2 gap-x-4 text-sm"
        role="group"
        aria-label="Who you pay against the allow-list"
      >
        <div className="min-w-0">
          <p className="text-fg">Who you pay</p>
          <p className="mt-1 break-all font-mono text-fg">{markedPayee(asked, listed, "deny")}</p>
          {oneForL && <p className="mt-1 text-deny">digit 1</p>}
        </div>
        <div className="min-w-0">
          <p className="text-fg">Allow-list</p>
          <p className="mt-1 break-all font-mono text-fg">{markedPayee(listed, asked, "allow")}</p>
          {oneForL && <p className="mt-1 text-allow">letter l</p>}
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-subtle">
        Not among the allow-list above. Allow-list and look-alike spelling, not a scam registry.
      </p>
    </div>
  );
}

function attackTone(status: GateReceipt["status"] | undefined): string {
  if (status === "allow") return "text-allow";
  if (status === "needs_approval") return "text-fg";
  if (!status) return "text-muted";
  return "text-deny";
}

function attackMatrix(spoken: SpokenAsk[], frozen: boolean) {
  const beat = (id: string) => spoken.find((item) => item.beat.id === id);
  const allow = beat("allow");
  const hold = beat("hold");
  const block = beat("block");
  const poison = beat("poison");
  const burst = beat("burst");
  return [
    { text: allow ? "Allowed" : "Allow", className: attackTone(allow?.receipt.status) },
    {
      text: hold ? (hold.receipt.rule === "frozen" ? "Dropped" : "On hold") : "Hold",
      className: attackTone(hold?.receipt.status),
    },
    { text: "Over cap", className: block ? "text-deny" : "text-muted" },
    { text: "Look-alike", className: poison ? "text-deny" : "text-muted" },
    { text: burst ? "Over day" : "Burst", className: burst ? "text-deny" : "text-muted" },
    {
      text: allow?.replay ? "Duplicate" : "Same key",
      className: allow?.replay ? "text-fg" : "text-muted",
    },
    { text: frozen ? "Frozen" : "Freeze", className: "font-medium text-deny" },
  ];
}

function DuplicateKey({
  who,
  amount,
  settlement,
}: {
  who: string;
  amount: string;
  settlement: Settlement | null;
}) {
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="text-sm leading-6 text-fg">
        <span className="mr-2 inline-flex rounded-control border border-border bg-surface px-2 py-0.5 font-medium">
          Duplicate
        </span>
        {who} {amount}. Same key. A second payment was refused.
      </p>
      <IntentsHonesty settlement={settlement} />
    </div>
  );
}

function outcomeLine(status: GateReceipt["status"], rule: string | null): string {
  if (status === "allow") return "Allowed";
  if (status === "needs_approval") return "On hold";
  if (status === "cancelled" && rule === "frozen") return "Dropped · frozen";
  if (status === "cancelled") return "Cancelled";
  if (rule === "max_per_transaction") return "Blocked · over the cap";
  if (rule === "allowed_recipients") return "Blocked · not on the list";
  if (rule === "frozen") return "Blocked · frozen";
  if (rule === "daily_limit") return "Blocked · over the day";
  return "Blocked";
}

function statusClass(status: GateReceipt["status"]): string {
  if (status === "allow") return "bg-allow-bg text-allow";
  if (status === "needs_approval") return "border border-border bg-surface text-fg";
  if (status === "cancelled") return "bg-elevated text-muted";
  return "bg-surface text-deny";
}

function askCue(beat: AgentBeat): { who: string; cue: string } {
  const to = String(beat.body.to);
  if (beat.id === "poison")
    return { who: "Look-alike payee", cue: `${to} looks like hotel.near · not on the list` };
  if (beat.id === "burst") {
    return {
      who: "Burst of rides",
      cue: `${to} · ${formatUsd(Number(beat.body.amountUsd))} each · the day stops the last`,
    };
  }
  if (beat.id === "jailbreak")
    return { who: "Not on the list", cue: `${to} · a fake approval is ignored` };
  const who = to.startsWith("hotel")
    ? "Hotel"
    : to.startsWith("airline")
      ? "Airline"
      : to.startsWith("rides")
        ? "Rides"
        : "Vendor";
  if (beat.id === "hold") return { who, cue: `Over the line · ${to}` };
  if (beat.id === "block") return { who, cue: `Over the cap · ${to}` };
  return { who, cue: `Under the line · ${to}` };
}

function PolicySummary({ policy }: { policy: HumanPolicy }) {
  return (
    <p className="text-sm text-muted">
      ≤ {formatUsd(policy.maxPerTransactionUsd)} / tx · {formatUsd(policy.dailyLimitUsd)} / day ·
      approve above {formatUsd(policy.approvalThresholdUsd)} · {policy.allowedRecipients.length}{" "}
      recipients · {policy.frozen ? "frozen" : "active"} · privacy{" "}
      {policy.privacyMode ?? "minimize"}
    </p>
  );
}

function ReceiptSlip({ receipt }: { receipt: GateReceipt | PublicGateReceipt }) {
  const when = new Date(receipt.at);
  const time = Number.isNaN(when.getTime())
    ? receipt.at
    : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <article className="border-t border-border pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-medium tabular-nums">
            {formatUsd(receipt.request.amountUsd)}{" "}
            <span className="text-muted">{receipt.request.asset.toUpperCase()}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            to {receipt.request.to} · {receipt.request.chain}
            {receipt.request.purpose
              ? ` · ${receipt.request.purpose}`
              : receipt.request.purpose === null
                ? " · purpose hidden"
                : ""}
          </p>
        </div>
        <span
          className={`rounded-control px-2.5 py-1 text-sm font-medium ${statusClass(receipt.status)}`}
        >
          {statusLabel(receipt.status)}
          {receipt.rule ? ` · ${receipt.rule}` : ""}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6">{receipt.detail}</p>
      {receipt.ignoredFields.length > 0 && (
        <div className="mt-3 border border-hold bg-hold-bg px-3 py-3" role="status">
          <p className="text-sm font-medium text-hold">Fake approval ignored</p>
          <p className="mt-1 font-mono text-xs text-fg">{receipt.ignoredFields.join(", ")}</p>
          <p className="mt-1 text-sm text-muted">
            The checker decided again from your saved rules. The AI cannot raise caps, change who
            gets paid, or mark a payment approved by itself.
          </p>
        </div>
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
              ? "Practice custody check passed. Money was not sent."
              : "Rules checked in this app. Not a hardware vault. Money was not sent."}
          </p>
          <p className="mt-3 font-mono text-xs leading-5 text-muted">
            NEAR intents · {receipt.settlement.amountUnits} units of {receipt.settlement.token}
            <br />
            {receipt.settlement.sourceChain} → {receipt.settlement.destinationChain} ·{" "}
            {receipt.settlement.recipient}
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
          {receipt.settlement.quote && (
            <div className="mt-3 border border-border bg-bg px-3 py-3">
              <p className="text-sm font-medium text-fg">NEAR Intents · 1-Click dry quote</p>
              {receipt.settlement.quote.status === "ok" ? (
                <p className="mt-1 font-mono text-xs leading-5 text-muted">
                  quote {receipt.settlement.quote.correlationId}
                  {receipt.settlement.quote.amountOutFormatted
                    ? ` · out ${receipt.settlement.quote.amountOutFormatted} USDC`
                    : ""}
                  {receipt.settlement.quote.amountOutUsd
                    ? ` · ≈ $${receipt.settlement.quote.amountOutUsd}`
                    : ""}
                  <br />
                  path {receipt.settlement.sourceChain} → {receipt.settlement.destinationChain} ·
                  dry only
                  <br />
                  submitted {String(receipt.settlement.submitted)} · not a broadcast · not a fill
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">{receipt.settlement.quote.note}</p>
              )}
            </div>
          )}
        </div>
      )}
      <p className="mt-4 font-mono text-xs text-subtle">
        {time} · remaining {formatUsd(receipt.remainingDailyUsd)} · fingerprint{" "}
        {receipt.attestation.policyFingerprint}
      </p>
      <p className="mt-2 font-mono text-xs text-subtle break-all">
        Share (agent-minimized): /api/v1/receipt?id={receipt.id}
      </p>
    </article>
  );
}

export function Console() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<HumanPolicy>(TRAVEL_POLICY);
  const [recipientsText, setRecipientsText] = useState(TRAVEL_POLICY.allowedRecipients.join("\n"));
  const [amount, setAmount] = useState("8");
  const [to, setTo] = useState("vendor.near");
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("base");
  const [purpose, setPurpose] = useState("API invoice 14");
  const [fundAmount, setFundAmount] = useState("50");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<SpokenAsk[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [activeBeat, setActiveBeat] = useState<string | null>(null);
  const [script, setScript] = useState<AgentScript>("travel");
  const [runSerial, setRunSerial] = useState(0);
  const [freezeProbe, setFreezeProbe] = useState<GateReceipt | null>(null);
  const revision = useRef(0);
  const inFlight = useRef(false);
  const matrixRef = useRef<HTMLLIElement | null>(null);
  const poisonRef = useRef<HTMLLIElement | null>(null);
  const asksRef = useRef<HTMLElement | null>(null);
  const matrixSeen = useRef<string | null>(null);

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

  const landedBeatId = scrollBeatId(spoken, snap?.pending, busy);

  useEffect(() => {
    if (busy || runSerial === 0 || !landedBeatId) return;
    if (matrixSeen.current === String(runSerial)) return;
    matrixSeen.current = String(runSerial);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showWho = spoken.some((item) => item.beat.id === "poison");
    const target = showWho
      ? poisonRef.current
      : spoken.length > 1
        ? asksRef.current
        : matrixRef.current;
    target?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: showWho ? "end" : "start",
    });
  }, [busy, runSerial, landedBeatId, spoken]);

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

  async function resetDemo() {
    setSpoken([]);
    setSpeaking(null);
    setActiveBeat(null);
    setFocusId(null);
    await prepare();
  }

  async function setFrozen(frozen: boolean) {
    const base = snap?.policy ?? draftFromText();
    const result = await freezeDesk({ data: { policy: base, frozen } });
    const gate = result.gate;
    const next = gate.policy ?? { ...base, frozen };
    setDraft(next);
    setRecipientsText(next.allowedRecipients.join("\n"));
    setSnap(gate);
    if (!frozen || !result.receipt) {
      setFreezeProbe(null);
      return;
    }
    setSpoken((current) =>
      current.map((item) => {
        if (item.receipt.status !== "needs_approval") return item;
        const dropped = gate.ledger.find(
          (entry) =>
            entry.status === "cancelled" &&
            entry.rule === "frozen" &&
            entry.request.amountUsd === item.receipt.request.amountUsd,
        );
        return dropped ? { ...item, receipt: dropped } : item;
      }),
    );
    setFreezeProbe(result.receipt);
  }

  async function pay(body: Record<string, unknown>) {
    const result = await requestPayment({ data: body });
    setSnap(result.gate);
    setFocusId(result.receipt.id);
  }

  function loadTravelOps() {
    if (inFlight.current) return;
    setDraft(TRAVEL_POLICY);
    setRecipientsText(TRAVEL_POLICY.allowedRecipients.join("\n"));
    setScript("travel");
    setSpoken([]);
    setSpeaking(null);
    setActiveBeat(null);
    setFocusId(null);
    setFormError(null);
  }

  async function playBeats(policy: HumanPolicy, nextScript: AgentScript) {
    setRunSerial((value) => value + 1);
    setFreezeProbe(null);
    setScript(nextScript);
    setSpoken([]);
    setActiveBeat(null);
    setSpeaking(nextScript === "travel" ? "Preparing the trip…" : "Preparing the vendor demo…");
    const runId = crypto.randomUUID().slice(0, 8);
    // One server fn: prepareDemo + four submitPayment calls share the same
    // isolate / in-memory PGLite. Separate prepare then POST /api/v1/pay
    // races cold isolates on Vercel and returns 409 no_policy.
    const result = (await runDemoAgent({ data: { policy, runId, script: nextScript } })) as {
      gate: Snapshot;
      results: Array<{
        beat: DemoBeatView;
        receipt: PublicGateReceipt;
        legs?: DemoBeatLeg[];
        replay?: DemoReplay | null;
      }>;
    };
    setSnap(result.gate);
    setDraft(policy);
    setRecipientsText(policy.allowedRecipients.join("\n"));
    for (const item of result.results) {
      setActiveBeat(item.beat.id);
      setSpeaking(item.beat.says);
      await new Promise((resolve) => setTimeout(resolve, 280));
      setSpoken((current) => [
        ...current,
        {
          beat: item.beat,
          receipt: item.receipt,
          legs: item.legs ?? [],
          replay: item.replay ?? null,
        },
      ]);
      setFocusId(item.receipt.id);
      setActiveBeat(null);
      setSpeaking(null);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
  }

  async function runAgent() {
    await playBeats(DEMO_POLICY, "demo");
  }

  async function runTravelAgent() {
    await playBeats(TRAVEL_POLICY, "travel");
  }

  async function runScenario(only: (typeof SCENARIOS)[number]["id"]) {
    setRunSerial((value) => value + 1);
    setFreezeProbe(null);
    setScript("travel");
    setSpoken([]);
    setActiveBeat(only);
    setSpeaking(
      only === "poison"
        ? "Replaying the look-alike payee…"
        : only === "burst"
          ? "Replaying the burst of rides…"
          : only === "block"
            ? "Replaying the over-cap ask…"
            : "Preparing that ask…",
    );
    const runId = crypto.randomUUID().slice(0, 8);
    const result = (await runDemoAgent({
      data: { policy: TRAVEL_POLICY, runId, script: "travel", only },
    })) as {
      gate: Snapshot;
      results: Array<{
        beat: DemoBeatView;
        receipt: PublicGateReceipt;
        legs?: DemoBeatLeg[];
        replay?: DemoReplay | null;
      }>;
    };
    setSnap(result.gate);
    setDraft(TRAVEL_POLICY);
    setRecipientsText(TRAVEL_POLICY.allowedRecipients.join("\n"));
    const item = result.results[0];
    if (!item) return;
    setActiveBeat(item.beat.id);
    setSpeaking(item.beat.says);
    await new Promise((resolve) => setTimeout(resolve, 280));
    setSpoken([
      {
        beat: item.beat,
        receipt: item.receipt,
        legs: item.legs ?? [],
        replay: item.replay ?? null,
      },
    ]);
    setFocusId(item.receipt.id);
    setActiveBeat(null);
    setSpeaking(null);
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

  async function decide(id: string, action: "approve" | "reject") {
    const result = await decideApproval({ data: { id, action } });
    setSnap(result.gate);
    setFocusId(result.receipt.id);
    // Approve mints a new receipt id. Point the row at it, or the list keeps the old "On hold".
    if (result.gate.pending.some((item) => item.id === id)) return;
    const next = result.receipt;
    setSpoken((current) =>
      current.map((item) => {
        const touches = item.receipt.id === id || item.legs.some((leg) => leg.id === id);
        if (!touches) return item;
        return {
          ...item,
          receipt: item.receipt.id === id ? next : item.receipt,
          legs: item.legs.map((leg) =>
            leg.id === id
              ? { ...leg, id: next.id, status: next.status, rule: next.rule, detail: next.detail }
              : leg,
          ),
        };
      }),
    );
  }

  const focused = snap?.ledger.find((item) => item.id === focusId) ?? snap?.ledger[0] ?? null;
  const saved = snap?.policy;
  const plan = script === "travel" ? travelAgentBeats("plan") : agentBeats("plan");
  const spokenIds = new Set(spoken.map((item) => item.receipt.id));
  const extraPending = (snap?.pending ?? []).filter((item) => !spokenIds.has(item.id));
  const holdNeedsYou = (snap?.pending.length ?? 0) > 0;
  const runLabel = busy && script === "travel" ? "Running the trip…" : "Run travel agent";
  const showFreeze = script === "travel" && spoken.length > 0;
  const deskFrozen = Boolean(saved?.frozen);
  const allowSpoken = spoken.find((item) => item.beat.id === "allow");
  const allowSettlement =
    (allowSpoken &&
      (snap?.ledger.find((item) => item.id === allowSpoken.receipt.id)?.settlement ??
        allowSpoken.receipt.settlement)) ||
    null;

  return (
    <>
      <SiteNav current="console" />
      <main
        className={`mx-auto w-full max-w-xl px-5 py-6 sm:py-10 ${showFreeze ? (deskFrozen ? "pb-44" : "pb-24") : ""}`}
      >
        <h1 className="font-display text-3xl leading-tight tracking-tight text-fg sm:text-5xl">
          The trip asks to pay.
        </h1>
        <p className="mt-2 max-w-[40rem] text-sm leading-6 text-muted sm:mt-3 sm:text-base sm:leading-7">
          An agent can ask to pay hotels, airlines, and rides; Mandate enforces the human's caps,
          allow-list, hold, and freeze — the agent cannot sign.
        </p>

        {loadError && (
          <p className="mt-4 bg-deny-bg px-3 py-2 text-sm text-deny" role="alert">
            {loadError}
          </p>
        )}

        <section className="mt-6 sm:mt-8" aria-labelledby="caps-heading">
          <h2 id="caps-heading" className="text-base font-medium text-fg">
            Caps
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Run travel agent uses these caps. Edits live under Advanced.
          </p>
          <div className="mt-4 border-y border-border">
            <dl className="grid grid-cols-3 gap-3 py-4">
              <div>
                <dt className="text-xs text-muted">Per payment</dt>
                <dd className="mt-1 font-mono text-lg leading-none tabular-nums">
                  {formatUsd(TRAVEL_POLICY.maxPerTransactionUsd)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Today</dt>
                <dd className="mt-1 font-mono text-lg leading-none tabular-nums">
                  {formatUsd(TRAVEL_POLICY.dailyLimitUsd)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Ask you above</dt>
                <dd className="mt-1 font-mono text-lg leading-none tabular-nums">
                  {formatUsd(TRAVEL_POLICY.approvalThresholdUsd)}
                </dd>
              </div>
            </dl>
            <div className="border-t border-border py-3">
              <p className="text-xs text-muted">Allow-list</p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Allow-list">
                {TRAVEL_POLICY.allowedRecipients.map((account) => {
                  const id = merchantOf(account);
                  return (
                    <li key={account}>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-control border border-border bg-surface px-2 py-1 font-mono text-sm ${
                          id ? merchantTextClass(id) : "text-fg"
                        }`}
                      >
                        {id ? <MerchantMark id={id} decorative /> : null}
                        {account}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-subtle">
            Preview float {formatUsd(TRAVEL_DEMO_BALANCE_USD)}. Not a wallet. Money is not sent.
          </p>
        </section>

        {extraPending.length > 0 && (
          <section className="mt-8 bg-hold-bg px-4 py-4" aria-labelledby="hold-heading">
            <h2 id="hold-heading" className="text-base font-medium">
              On hold
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {extraPending.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm tabular-nums">
                      {formatUsd(item.request.amountUsd)} · {item.request.to}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className={`${primaryBtn} flex-1 sm:flex-none sm:min-w-28`}
                      onClick={() => run(() => decide(item.id, "approve"))}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={`${quietBtn} shrink-0`}
                      onClick={() => run(() => decide(item.id, "reject"))}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            className={holdNeedsYou ? `${quietBtn} w-full` : `${primaryBtn} w-full`}
            onClick={() => run(runTravelAgent)}
          >
            {runLabel}
          </button>
          {speaking && (
            <p className="mt-3 text-sm text-fg" aria-live="polite">
              {speaking}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-muted">
            Publishes the travel caps and plays five asks. The look-alike payee blocks. The ride
            burst stops when the day is full.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1" aria-label="One ask">
            {SCENARIOS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={busy}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-control px-1.5 text-sm transition-colors duration-150 hover:bg-elevated hover:text-fg disabled:opacity-50 ${
                    activeBeat === item.id ? "bg-elevated font-medium text-fg" : "text-muted"
                  }`}
                  onClick={() => run(() => runScenario(item.id))}
                >
                  <MerchantMark id={item.merchant} />
                  {item.label}
                  {item.hint ? ` ${item.hint}` : ""}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm leading-6 text-subtle">
            One ask, same caps. Look-alike replays hote1.near. Burst replays the rides. If a cold
            server forgot the rules, run again.
          </p>
          {formError && (
            <p className="mt-3 bg-deny-bg px-3 py-2 text-sm text-deny" role="alert">
              {formError}
            </p>
          )}
        </div>

        {showFreeze && (
          <div className="sticky top-[57px] z-30 -mx-5 mt-8 border-b border-border bg-bg px-5 py-2 sm:top-[69px]">
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs leading-5" aria-label="Attacks">
              {attackMatrix(spoken, deskFrozen).map((mark) => (
                <span key={mark.text} className={mark.className}>
                  {mark.text}
                </span>
              ))}
            </p>
            <IntentsHonesty settlement={allowSettlement} />
          </div>
        )}

        <section ref={asksRef} className="mt-6 scroll-mt-32" aria-labelledby="asks-heading">
          <h2 id="asks-heading" className="text-base font-medium text-fg">
            Allow, hold, or block
          </h2>
          <ol className="mt-3 divide-y divide-border border-y border-border" aria-live="polite">
            {plan.map((beat) => {
              const revealed = spoken.find((item) => item.beat.id === beat.id);
              const full = revealed
                ? snap?.ledger.find((item) => item.id === revealed.receipt.id)
                : undefined;
              const status = full?.status ?? revealed?.receipt.status;
              const rule = full?.rule ?? revealed?.receipt.rule ?? null;
              const pending = revealed
                ? snap?.pending.some((item) => item.id === revealed.receipt.id)
                : false;
              const { who, cue } = askCue(beat);
              const merchant = merchantOf(String(beat.body.to));
              const amountUsd = Number(beat.body.amountUsd);
              const poisoned = beat.id === "poison" && Boolean(status);
              const legs = revealed?.legs ?? [];
              const showLegs = legs.length > 1;
              const allowSettlements = legs
                .filter((leg) => leg.status === "allow")
                .map((leg) => snap?.ledger.find((item) => item.id === leg.id)?.settlement)
                .filter((item): item is Settlement => Boolean(item));
              const rowSettlement = showLegs
                ? (allowSettlements.find((item) => item.quote?.status === "ok") ??
                  allowSettlements[0] ??
                  null)
                : status === "allow"
                  ? (full?.settlement ?? revealed?.receipt.settlement ?? null)
                  : null;
              const anchorId = landedBeatId;
              const rowTint = poisoned
                ? "bg-deny-bg"
                : pending
                  ? "bg-hold-bg"
                  : activeBeat === beat.id
                    ? "bg-elevated"
                    : "";
              const nameClass =
                merchant && beat.id !== "poison" ? merchantTextClass(merchant) : "text-fg";
              return (
                <li
                  key={beat.id}
                  ref={(node) => {
                    if (beat.id === "poison") poisonRef.current = node;
                    if (beat.id === anchorId) matrixRef.current = node;
                  }}
                  className={`scroll-mt-24 scroll-mb-6 py-4 ${rowTint ? `-mx-5 px-5 ${rowTint}` : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {merchant ? (
                      <span className="mt-0.5">
                        <MerchantMark
                          id={merchant}
                          decorative
                          framed
                          suspect={beat.id === "poison"}
                        />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`font-medium ${nameClass}`}>{who}</p>
                        <p className="shrink-0 font-mono text-sm tabular-nums text-fg">
                          {formatUsd(amountUsd)}
                        </p>
                      </div>
                      {beat.id === "poison" && (
                        <WhoAsked
                          asked={String(beat.body.to)}
                          listed="hotel.near"
                          blocked={status === "reject"}
                        />
                      )}
                      {status ? (
                        <p className="mt-2">
                          <span
                            className={`inline-flex rounded-control px-2 py-0.5 font-medium ${
                              pending ? "text-base" : "text-sm"
                            } ${statusClass(status)}`}
                          >
                            {outcomeLine(status, rule)}
                          </span>
                        </p>
                      ) : activeBeat === beat.id ? (
                        <p className="mt-2 text-sm font-medium text-fg">Asking…</p>
                      ) : null}
                      {!(beat.id === "poison" && status) && (
                        <p className="mt-1 text-sm leading-6 text-muted">{cue}</p>
                      )}
                      {pending && revealed && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            className={`${primaryBtn} flex-1`}
                            onClick={() => run(() => decide(revealed.receipt.id, "approve"))}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className={`${quietBtn} shrink-0`}
                            onClick={() => run(() => decide(revealed.receipt.id, "reject"))}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {full && !showLegs && (
                        <p className="mt-2 text-sm leading-6 text-muted">{full.detail}</p>
                      )}
                      {full && full.ignoredFields.length > 0 && (
                        <p className="mt-2 text-sm leading-6 text-deny">
                          Fake approval ignored · {full.ignoredFields.join(", ")}
                        </p>
                      )}
                      {showLegs && (
                        <ol className="mt-3 space-y-2">
                          {legs.map((leg, index) => (
                            <li
                              key={leg.id}
                              className="flex items-baseline justify-between gap-3 text-sm"
                            >
                              <span className="text-muted">
                                {index + 1}. {formatUsd(leg.amountUsd)}
                              </span>
                              <span
                                className={`shrink-0 rounded-control px-2 py-0.5 font-medium ${statusClass(leg.status)}`}
                              >
                                {outcomeLine(leg.status, leg.rule)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {full && showLegs && (
                        <p className="mt-2 text-sm leading-6 text-muted">{full.detail}</p>
                      )}
                      {rowSettlement && <IntentsReceipt settlement={rowSettlement} />}
                      {revealed?.replay?.sameReceipt && (
                        <DuplicateKey
                          who={who}
                          amount={formatUsd(amountUsd)}
                          settlement={rowSettlement}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm leading-6 text-subtle">
            A blocked ask does not spend the day. The burst spends only the rides that fit. Nothing
            is broadcast.
          </p>
        </section>

        <section
          className="mt-14 border-t border-border pt-8"
          aria-labelledby="composition-heading"
        >
          <h2 id="composition-heading" className="text-base font-medium text-fg">
            NEAR composition
          </h2>
          <dl className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-fg">Live today</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                Rules checked in this app. NEAR Intents dry quote when the server returns one.{" "}
                <span className="font-mono text-fg">submitted false</span>. No transaction hash. A
                sleeping server can forget the desk. Run again.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-fg">Next</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                OutLayer Agent Custody holds the keys. A Function Call Key can only request a
                payment. Roadmap. This desk stays the travel-ops rules in front of that.
              </dd>
            </div>
          </dl>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a
              href="https://app.outlayer.ai/docs/agent-custody"
              className="text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
              rel="noreferrer"
              target="_blank"
            >
              OutLayer Agent Custody
            </a>
            <a
              href="/docs#fck"
              className="text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
            >
              Function Call Keys
            </a>
            <a
              href="/docs#settlement"
              className="text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
            >
              Settlement
            </a>
          </p>
        </section>

        <details className="desk-disclosure mt-10 border-t border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
            <span className="text-fg">Advanced</span>
            <ChevronDown
              aria-hidden="true"
              className="desk-chevron size-4 shrink-0"
              strokeWidth={1.75}
            />
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted">
            Editor, the $8 vendor demo, ledger, and the raw receipt. Run travel agent still
            publishes the travel caps, not unsaved edits.
          </p>

          <div className="mt-8">
            <h2 className="text-sm font-medium">Your caps</h2>
            {saved ? (
              <div className="mt-3">
                <PolicySummary policy={saved} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-hold">
                No rules saved yet. A single ask is refused until you save.
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>Max USD / tx</span>
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
                <span className={labelClass}>Daily USD limit</span>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={draft.dailyLimitUsd}
                  onChange={(event) =>
                    setDraft({ ...draft, dailyLimitUsd: Number(event.target.value) })
                  }
                />
              </label>
              <label className="col-span-2">
                <span className={labelClass}>Approval above USD</span>
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
                <span className={labelClass}>Allow-list</span>
                <textarea
                  className="min-h-28 w-full rounded-control border border-border bg-bg px-3 py-2 font-mono text-sm text-fg"
                  value={recipientsText}
                  onChange={(event) => setRecipientsText(event.target.value)}
                />
                <span className={helpClass}>One recipient per line (.near or 0x…).</span>
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              className={`${primaryBtn} mt-4 w-full`}
              onClick={() => run(() => save())}
            >
              Save rules
            </button>
            <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={(draft.privacyMode ?? "minimize") === "minimize"}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    privacyMode: event.target.checked ? "minimize" : "full",
                  })
                }
              />
              Privacy minimize on shared receipts
            </label>
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-medium">Panic freeze</p>
              <p className="mt-1 text-sm leading-6 text-subtle">
                Waiting holds cancel. New asks are blocked until you unfreeze. The AI cannot
                unfreeze this.
              </p>
              <button
                type="button"
                disabled={busy || !saved}
                className={`mt-3 h-11 w-full rounded-control px-4 text-sm font-medium transition-colors duration-150 disabled:opacity-50 ${
                  saved?.frozen
                    ? "border border-border hover:border-fg"
                    : "bg-deny-bg text-deny hover:opacity-90"
                }`}
                onClick={() => run(() => setFrozen(!(saved?.frozen ?? draft.frozen)))}
              >
                {saved?.frozen ? "Unfreeze wallet" : "Freeze wallet now"}
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Other demos</h2>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={loadTravelOps}
            >
              Load travel ops
            </button>
            <p className={helpClass}>
              Fills this editor: {formatUsd(TRAVEL_POLICY.maxPerTransactionUsd)} / tx,{" "}
              {formatUsd(TRAVEL_POLICY.dailyLimitUsd)} / day, approve above{" "}
              {formatUsd(TRAVEL_POLICY.approvalThresholdUsd)},{" "}
              {TRAVEL_POLICY.allowedRecipients.join(", ")}.
            </p>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(prepare)}
            >
              Prepare demo · $50/day · $200 USDC
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(runAgent)}
            >
              {busy && speaking && script === "demo" ? "Running the vendor demo…" : "Run the demo"}
            </button>
            <p className={helpClass}>
              $8 vendor path: allow, hold, over the cap, and a fake approval that is ignored.
            </p>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(resetDemo)}
            >
              Reset demo · wipe ledger + republish
            </button>
            <div className="mt-3">
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
                  className={quietBtn}
                  onClick={() =>
                    run(async () => {
                      const gate = await addFunds({
                        data: { amountUsd: Number(fundAmount), mode: "add" },
                      });
                      setSnap(gate);
                    })
                  }
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Ask once</h2>
            <p className="mt-1 text-sm text-muted">
              A single payment through the same gate. Extra fields are discarded.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Amount (USDC)</span>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
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
                <input
                  className={`${fieldClass} font-mono`}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Purpose</span>
                <input
                  className={fieldClass}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} mt-4 w-full`}
              onClick={() => run(() => submitCurrent())}
            >
              Request this payment
            </button>
          </div>

          {saved && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-medium">Policy document</h2>
              <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all bg-bg p-3 font-mono text-xs leading-5 text-muted">
                {JSON.stringify(enclaveDocument(saved), null, 2)}
              </pre>
              <p className="mt-2 text-sm text-muted">
                Same caps. Evaluated in process memory. This block is not an attestation.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Ledger</h2>
            <p className="mt-1 text-sm text-muted">
              Newest first. Blocks do not spend the daily limit.
            </p>
            {snap && snap.ledger.length > 0 ? (
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {snap.ledger.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setFocusId(item.id)}
                      className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between"
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
            {focused ? (
              <div className="mt-4">
                <ReceiptSlip receipt={focused} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No receipt yet.</p>
            )}
            <p className="mt-4 text-xs leading-5 text-subtle">
              {snap?.durability ?? "…"}
              {saved ? ` · ${saved.frozen ? "frozen" : "active"}` : " · no policy"}
              {snap?.fingerprint ? ` · fp ${snap.fingerprint.slice(0, 8)}` : ""}
              {" · "}
              balance {formatUsd(snap?.balanceUsd ?? 0)}
              {snap?.liveKey ? " · dry-run on allow" : " · dry-run not called"}
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Walkthrough</h2>
            <div className="mt-3 overflow-hidden border border-border bg-bg">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/demo/console-poster.jpg"
                className="aspect-video w-full bg-bg"
              >
                <source src="/demo/console-walkthrough.mp4" type="video/mp4" />
              </video>
            </div>
            {!HAS_CONSOLE_DEMO_VIDEO && (
              <p className="mt-3 text-sm text-subtle">Demo video uploading.</p>
            )}
          </div>
        </details>
      </main>
      {showFreeze && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg">
          <div className="mx-auto w-full max-w-xl px-5 py-3">
            {deskFrozen ? (
              <div>
                <p className="text-sm font-medium text-deny">Desk frozen</p>
                {freezeProbe && (
                  <p className="mt-1 text-sm text-fg">
                    Hotel {formatUsd(freezeProbe.request.amountUsd)} ·{" "}
                    {outcomeLine(freezeProbe.status, freezeProbe.rule)}
                  </p>
                )}
                <p className="mt-1 text-sm leading-6 text-muted">
                  {freezeProbe?.detail ?? "New asks are blocked. Waiting holds were dropped."}
                </p>
                <IntentsHonesty settlement={freezeProbe?.settlement} />
                <button
                  type="button"
                  disabled={busy}
                  className={`${quietBtn} mt-3 w-full`}
                  onClick={() => run(() => setFrozen(false))}
                >
                  Unfreeze
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || !saved}
                className="h-11 w-full rounded-control bg-deny-bg px-4 text-sm font-medium text-deny transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
                onClick={() => run(() => setFrozen(true))}
              >
                Freeze desk
              </button>
            )}
          </div>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
