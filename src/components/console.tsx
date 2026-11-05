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
import { ATTACK_SUITE, ATTACK_SUITE_NOTE } from "@/lib/attack-suite";
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
  if (error instanceof Error && error.message) {
    if (error.message.startsWith("No policy")) {
      return "No rules saved yet. Save them before the helper can ask.";
    }
    if (error.message.startsWith("Conflict:")) {
      const rest = error.message.slice("Conflict:".length).trim();
      return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return error.message;
  }
  return "That could not be finished.";
}

const SCENARIOS = [
  { id: "allow", label: "Yes", hint: "$80", merchant: "hotel" },
  { id: "hold", label: "Ask you", hint: "$250", merchant: "airline" },
  { id: "block", label: "Over limit", hint: "$500", merchant: "hotel" },
  { id: "poison", label: "Look-alike", hint: "", merchant: "hotel" },
  { id: "burst", label: "Too many rides", hint: "", merchant: "rides" },
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

/** Click or select-copy a real demo-quote id. The href is only that id, not a payment record. */
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
        aria-label={`Copy demo quote id ${id}. Not a payment record.`}
        title="Copy demo quote id. Not a payment record."
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
      NEAR demo ·{" "}
      {quoteId ? (
        <>
          demo quote <DryQuoteProof id={quoteId} />
        </>
      ) : (
        "demo quote not attached"
      )}
      {" · not sent yet · no payment record"}
    </p>
  );
}

function IntentsReceipt({ settlement }: { settlement: Settlement }) {
  const lines = intentsOptics(settlement);
  if (!lines) return null;
  const quoteId = copyableDryQuoteId(lines);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="text-sm font-medium text-fg">Demo quote · not sent yet</p>
      <p className="mt-1 text-xs leading-5 text-subtle">
        NEAR hackathon demo. Money was not sent. USDC here means dollars in the demo.
      </p>
      <IntentsHonesty settlement={settlement} tone="fg" />
      <dl className="mt-1.5 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 font-mono text-xs leading-4">
        <dt className="text-subtle">Sent?</dt>
        <dd className="text-fg">no — not sent yet</dd>
        <dt className="text-subtle">Route</dt>
        <dd className="text-fg">{lines.path}</dd>
        <dt className="text-subtle">Demo quote</dt>
        <dd className="min-w-0 break-all text-fg">
          {quoteId ? <DryQuoteProof id={quoteId} /> : "not attached"}
        </dd>
        {lines.out && (
          <>
            <dt className="text-subtle">Would be</dt>
            <dd className="text-fg">{lines.out.replace(" USDC", " demo dollars")}</dd>
          </>
        )}
        <dt className="text-subtle">Payment record</dt>
        <dd className="text-fg">none</dd>
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
            Fake look-alike · not someone you can pay
          </span>
        </p>
      )}
      <div
        className="mt-2 grid grid-cols-2 gap-x-4 text-sm"
        role="group"
        aria-label="Who gets paid, next to who can be paid"
      >
        <div className="min-w-0">
          <p className="text-fg">Who gets paid</p>
          <p className="mt-1 break-all font-mono text-fg">{markedPayee(asked, listed, "deny")}</p>
          {oneForL && <p className="mt-1 text-deny">digit 1</p>}
        </div>
        <div className="min-w-0">
          <p className="text-fg">Who can be paid</p>
          <p className="mt-1 break-all font-mono text-fg">{markedPayee(listed, asked, "allow")}</p>
          {oneForL && <p className="mt-1 text-allow">letter l</p>}
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-subtle">
        This name is not someone you can pay. The spelling is a look-alike. This demo does not look up a scam list.
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
    { text: "Yes", className: attackTone(allow?.receipt.status) },
    {
      text: hold?.receipt.rule === "frozen" ? "Cancelled" : "Ask you",
      className: attackTone(hold?.receipt.status),
    },
    { text: "Over limit", className: block ? "text-deny" : "text-muted" },
    { text: "Look-alike", className: poison ? "text-deny" : "text-muted" },
    { text: burst ? "Over today" : "Too many rides", className: burst ? "text-deny" : "text-muted" },
    {
      text: "Same request",
      className: allow?.replay ? "text-fg" : "text-muted",
    },
    { text: frozen ? "Frozen" : "Freeze", className: "font-medium text-deny" },
  ];
}

function DuplicateKey({
  who,
  amount,
  settlement,
  receiptId,
}: {
  who: string;
  amount: string;
  settlement: Settlement | null;
  receiptId: string;
}) {
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="text-sm leading-6 text-fg">
        <span className="mr-2 inline-flex rounded-control border border-border bg-surface px-2 py-0.5 font-medium">
          Same request
        </span>
        {who} {amount}. Same receipt{" "}
        <span className="break-all font-mono">{receiptId}</span>. It was not counted twice.
      </p>
      <p className="mt-1 text-sm leading-6 text-subtle">
        Money was not sent back, because nothing was sent.
      </p>
      <IntentsHonesty settlement={settlement} />
    </div>
  );
}

function outcomeLine(status: GateReceipt["status"], rule: string | null): string {
  if (status === "allow") return "Yes";
  if (status === "needs_approval") return "Ask you";
  if (status === "cancelled" && rule === "frozen") return "Cancelled · desk frozen";
  if (status === "cancelled") return "Cancelled";
  if (rule === "max_per_transaction") return "No · over the spending limit";
  if (rule === "allowed_recipients") return "No · not someone you can pay";
  if (rule === "frozen") return "No · desk frozen";
  if (rule === "daily_limit") return "No · over today's limit";
  return "No";
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
    return {
      who: "Fake look-alike",
      cue: `${to} looks like hotel.near. It is not someone you can pay.`,
    };
  if (beat.id === "burst") {
    return {
      who: "Too many rides",
      cue: `${to} · ${formatUsd(Number(beat.body.amountUsd))} each · today's limit stops the last one`,
    };
  }
  if (beat.id === "jailbreak")
    return { who: "Not someone you can pay", cue: `${to} · a fake yes is ignored` };
  const who = to.startsWith("hotel")
    ? "Hotel"
    : to.startsWith("airline")
      ? "Airline"
      : to.startsWith("rides")
        ? "Rides"
        : "Vendor";
  if (beat.id === "hold") return { who, cue: `Over the ask-you line · ${to}` };
  if (beat.id === "block") return { who, cue: `Over the spending limit · ${to}` };
  return { who, cue: `Inside your limits · ${to}` };
}

function PolicySummary({ policy }: { policy: HumanPolicy }) {
  return (
    <p className="text-sm text-muted">
      Up to {formatUsd(policy.maxPerTransactionUsd)} each · {formatUsd(policy.dailyLimitUsd)} today ·
      ask you above {formatUsd(policy.approvalThresholdUsd)} · {policy.allowedRecipients.length} who can
      be paid · {policy.frozen ? "desk frozen" : "active"} · shared receipts{" "}
      {(policy.privacyMode ?? "minimize") === "minimize" ? "hide extra detail" : "show the full note"}
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
            <span className="text-muted">demo dollars</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            to {receipt.request.to} · {receipt.request.chain}
            {receipt.request.purpose
              ? ` · ${receipt.request.purpose}`
              : receipt.request.purpose === null
                ? " · reason hidden"
                : ""}
          </p>
        </div>
        <span
          className={`rounded-control px-2.5 py-1 text-sm font-medium ${statusClass(receipt.status)}`}
        >
          {outcomeLine(receipt.status, receipt.rule)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6">{receipt.detail}</p>
      {receipt.ignoredFields.length > 0 && (
        <div className="mt-3 border border-hold bg-hold-bg px-3 py-3" role="status">
          <p className="text-sm font-medium text-hold">Fake approval ignored</p>
          <p className="mt-1 font-mono text-xs text-fg">{receipt.ignoredFields.join(", ")}</p>
          <p className="mt-1 text-sm text-muted">
            The desk checked your saved rules again. The helper cannot raise the spending limit, change
            who gets paid, or mark a payment as already approved.
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
              ? "Practice check passed. Money was not sent."
              : "Rules checked in this demo. Money was not sent."}
          </p>
          <p className="mt-3 font-mono text-xs leading-5 text-muted">
            Demo quote · {receipt.settlement.amountUnits} units of demo dollars
            <br />
            {receipt.settlement.sourceChain} → {receipt.settlement.destinationChain} ·{" "}
            {receipt.settlement.recipient}
            <br />
            not sent yet
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
              <p className="text-sm font-medium text-fg">NEAR demo quote · not sent yet</p>
              {receipt.settlement.quote.status === "ok" ? (
                <p className="mt-1 font-mono text-xs leading-5 text-muted">
                  demo quote {receipt.settlement.quote.correlationId}
                  {receipt.settlement.quote.amountOutFormatted
                    ? ` · would be ${receipt.settlement.quote.amountOutFormatted} demo dollars`
                    : ""}
                  {receipt.settlement.quote.amountOutUsd
                    ? ` · ≈ $${receipt.settlement.quote.amountOutUsd}`
                    : ""}
                  <br />
                  route {receipt.settlement.sourceChain} → {receipt.settlement.destinationChain} ·
                  practice check only
                  <br />
                  not sent yet · no payment record
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">{receipt.settlement.quote.note}</p>
              )}
            </div>
          )}
        </div>
      )}
      <p className="mt-4 font-mono text-xs text-subtle">
        {time} · left today {formatUsd(receipt.remainingDailyUsd)} · rules{" "}
        {receipt.attestation.policyFingerprint}
      </p>
      <p className="mt-2 font-mono text-xs text-subtle break-all">
        Share this receipt: /api/v1/receipt?id={receipt.id}
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
    setSpeaking(nextScript === "travel" ? "Preparing the trip…" : "Preparing the small demo…");
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
        ? "Replaying the fake look-alike…"
        : only === "burst"
          ? "Replaying too many rides…"
          : only === "block"
            ? "Replaying the over-limit ask…"
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
          You run a one-person travel business. A helper can ask to pay a hotel, an airline, or a ride. You keep
          the spending limits, who can be paid, when it must ask you first, and Freeze. The helper can ask. It
          cannot send the money.
        </p>
        <p className="mt-2 max-w-[40rem] text-sm leading-6 text-muted">
          This demo checks the rules and does not send money. There is no fake payment record. Freeze stops the
          desk in the demo. It does not pause the blockchain. USDC means dollars in this demo.
        </p>

        {loadError && (
          <p className="mt-4 bg-deny-bg px-3 py-2 text-sm text-deny" role="alert">
            {loadError}
          </p>
        )}

        <section className="mt-6 sm:mt-8" aria-labelledby="caps-heading">
          <h2 id="caps-heading" className="text-base font-medium text-fg">
            Spending limits
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Run travel agent uses these limits. You can change them under Advanced.
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
              <p className="text-xs text-muted">Who can be paid</p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Who can be paid">
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
            Demo balance {formatUsd(TRAVEL_DEMO_BALANCE_USD)}. This is not a real wallet. Money is not sent.
          </p>
        </section>

        {extraPending.length > 0 && (
          <section className="mt-8 bg-hold-bg px-4 py-4" aria-labelledby="hold-heading">
            <h2 id="hold-heading" className="text-base font-medium">
              Ask you
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
                      Yes
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={`${quietBtn} shrink-0`}
                      onClick={() => run(() => decide(item.id, "reject"))}
                    >
                      No
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
            Saves these spending limits and plays five asks. A fake look-alike name is blocked. Too many
            rides stop when the day is full. Money is not sent.
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
            One ask, same limits. Look-alike tries hote1.near, a wrong name that looks like hotel.near.
            Too many rides tries the rides again. If the page forgot your rules, run again.
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
            <p className="mt-0.5 text-xs leading-5 text-subtle">{ATTACK_SUITE_NOTE}</p>
            <IntentsHonesty settlement={allowSettlement} />
          </div>
        )}

        <section ref={asksRef} className="mt-6 scroll-mt-32" aria-labelledby="asks-heading">
          <h2 id="asks-heading" className="text-base font-medium text-fg">
            Yes, ask you, or no
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
                            Yes
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className={`${quietBtn} shrink-0`}
                            onClick={() => run(() => decide(revealed.receipt.id, "reject"))}
                          >
                            No
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
                          receiptId={revealed.replay.receiptId}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm leading-6 text-subtle">
            A no does not use up today's limit. Too many rides only count the ones that fit. Money is
            not sent.
          </p>
        </section>

        <section
          className="mt-14 border-t border-border pt-8"
          aria-labelledby="composition-heading"
        >
          <h2 id="composition-heading" className="text-base font-medium text-fg">
            What this demo does
          </h2>
          <dl className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-fg">Today</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                The desk checks your rules here. A NEAR demo quote may appear. Money is not sent.
                There is no payment record. If the page forgets the desk, press Run again.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-fg">Later</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                Not in this demo: a tighter key could limit what the helper is allowed to ask. It
                still would not replace your spending limit, who can be paid, or ask-you-first. The
                helper can ask. It cannot send the money.
              </dd>
            </div>
          </dl>
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
            Change the limits, try the small $8 demo, and read receipts. Run travel agent still
            uses the travel limits, not unsaved edits.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Extra checks: {ATTACK_SUITE.length} cases, already tested. The line under the legend
            names the ones this screen does not play.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle" aria-label="Extra checks">
            {ATTACK_SUITE.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>

          <div className="mt-8">
            <h2 className="text-sm font-medium">Your spending limits</h2>
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
                <span className={labelClass}>Most per payment</span>
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
                <span className={labelClass}>Most today</span>
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
                <span className={labelClass}>Ask you above</span>
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
                <span className={labelClass}>Who can be paid</span>
                <textarea
                  className="min-h-28 w-full rounded-control border border-border bg-bg px-3 py-2 font-mono text-sm text-fg"
                  value={recipientsText}
                  onChange={(event) => setRecipientsText(event.target.value)}
                />
                <span className={helpClass}>One name per line.</span>
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
              Hide extra detail on shared receipts
            </label>
            <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-subtle">
              Freeze is the button at the bottom after you press Run.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Other demos</h2>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={loadTravelOps}
            >
              Load hotel, airline, and rides
            </button>
            <p className={helpClass}>
              Fills this editor: up to {formatUsd(TRAVEL_POLICY.maxPerTransactionUsd)} each,{" "}
              {formatUsd(TRAVEL_POLICY.dailyLimitUsd)} today, ask you above{" "}
              {formatUsd(TRAVEL_POLICY.approvalThresholdUsd)},{" "}
              {TRAVEL_POLICY.allowedRecipients.join(", ")}.
            </p>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(prepare)}
            >
              Prepare a small demo · $50 today · $200 demo dollars
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(runAgent)}
            >
              {busy && speaking && script === "demo" ? "Running the small demo…" : "Run the small demo"}
            </button>
            <p className={helpClass}>
              $8 path: yes, ask you, over the limit, and a fake yes that is ignored.
            </p>
            <button
              type="button"
              disabled={busy}
              className={`${quietBtn} w-full`}
              onClick={() => run(resetDemo)}
            >
              Reset demo · clear receipts and save the small rules again
            </button>
            <div className="mt-3">
              <h3 className="text-sm font-medium">Add demo dollars</h3>
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
              One payment through the same rules. Extra fields are ignored. Money is not sent.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Amount (demo dollars)</span>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                <span className={labelClass}>Where it would go</span>
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
                <span className={labelClass}>Who gets paid</span>
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
              Ask for this payment
            </button>
          </div>

          {saved && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-medium">Saved rules</h2>
              <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all bg-bg p-3 font-mono text-xs leading-5 text-muted">
                {JSON.stringify(enclaveDocument(saved), null, 2)}
              </pre>
              <p className="mt-2 text-sm text-muted">
                Same limits, checked in this demo. This is not a locked hardware box. Money is not sent.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium">Receipts</h2>
            <p className="mt-1 text-sm text-muted">
              Newest first. A no does not use up today's limit.
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
                        {outcomeLine(item.status, item.rule)} · {item.request.chain}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-subtle">No receipts yet.</p>
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
              {saved ? ` · ${saved.frozen ? "desk frozen" : "active"}` : " · no rules yet"}
              {snap?.fingerprint ? ` · rules ${snap.fingerprint.slice(0, 8)}` : ""}
              {" · "}
              demo balance {formatUsd(snap?.balanceUsd ?? 0)}
              {snap?.liveKey ? " · practice check when yes" : " · practice check not used"}
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
                  {freezeProbe?.detail ?? "New asks are blocked. Waiting asks were dropped."}
                </p>
                <p className="mt-1 text-sm leading-6 text-subtle">
                  Freeze stops the desk in this demo. It does not pause the blockchain.
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
