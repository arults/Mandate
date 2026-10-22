import { Link } from "@tanstack/react-router";
import { ArrowRight, Ban, Check, Clock, ShieldOff } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const steps = [
  {
    n: "01",
    title: "Human sets the mandate",
    body: "Cap per payment, daily limit, allow-list, and a line that needs your approval. Once.",
  },
  {
    n: "02",
    title: "Agent posts one route",
    body: "Only POST /api/v1/pay. Amount, asset, recipient, chain, purpose. No key. No rewrite.",
  },
  {
    n: "03",
    title: "Gate answers — not the model",
    body: "allow · needs_approval · reject. Prompt injection cannot raise the cap or swap the payee.",
  },
];

const beats = [
  {
    icon: Check,
    tone: "bg-allow-bg text-allow",
    name: "Allow",
    amount: "$8",
    line: "On the list. Under your line. Not broadcast.",
  },
  {
    icon: Clock,
    tone: "bg-hold-bg text-hold",
    name: "Hold",
    amount: "$18",
    line: "You approve. The balance does not move.",
  },
  {
    icon: Ban,
    tone: "bg-deny-bg text-deny",
    name: "Block",
    amount: "$40",
    line: "Over the cap. The day is not spent.",
  },
  {
    icon: ShieldOff,
    tone: "bg-deny-bg text-deny",
    name: "Jailbreak",
    amount: "ignored",
    line: "approved: true still cannot sign.",
  },
];

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hero-grid opacity-[0.45]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                NEAR HACKATHON · Security · Agents · Business
              </p>
              <h1 className="mt-6 max-w-3xl font-display text-[2.75rem] leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl">
                The agent can ask.
                <span className="mt-1 block text-muted">It cannot sign.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                One human-authored spending mandate. Agents propose payments over a single HTTP surface. A
                policy gate outside the model returns allow, needs approval, or reject.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/console"
                  className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
                >
                  Watch the agent
                  <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex h-11 items-center border border-border bg-surface px-5 text-sm font-medium transition-colors duration-150 hover:border-fg"
                >
                  Read the litepaper
                </Link>
              </div>
              <p className="mt-5 text-sm text-subtle">
                Preview · process memory · settlement.submitted stays false · no invented tx hash
              </p>
            </div>

            <aside
              className="relative border border-border bg-surface p-5 sm:p-6"
              aria-label="Architecture sketch"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">Architecture</p>
              <div className="mt-5 space-y-3 font-mono text-xs leading-5 text-muted sm:text-sm">
                <div className="border border-border bg-bg px-3 py-2.5 text-fg">Human console → policy / fund / approve</div>
                <div className="flex justify-center text-subtle" aria-hidden="true">
                  ↓
                </div>
                <div className="border border-border bg-bg px-3 py-2.5 text-fg">Agent → POST /api/v1/pay only</div>
                <div className="flex justify-center text-subtle" aria-hidden="true">
                  ↓
                </div>
                <div className="border border-accent/40 bg-allow-bg/60 px-3 py-2.5 text-allow">
                  policy gate <span className="text-muted">(not LLM)</span>
                </div>
                <div className="flex justify-center text-subtle" aria-hidden="true">
                  ↓
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
                  <span className="border border-border bg-bg px-1 py-2 text-allow">allow</span>
                  <span className="border border-border bg-bg px-1 py-2 text-hold">hold</span>
                  <span className="border border-border bg-bg px-1 py-2 text-deny">reject</span>
                </div>
                <div className="flex justify-center text-subtle" aria-hidden="true">
                  ↓
                </div>
                <div className="border border-border bg-bg px-3 py-2.5">
                  receipt + NEAR Intents path{" "}
                  <span className="text-subtle">(preview: not broadcast)</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">How it works</p>
                <h2 id="how-heading" className="mt-2 font-display text-3xl tracking-tight text-fg sm:text-4xl">
                  Three steps. One trust boundary.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted">
                Authorization is not a language-model problem. It is a gate problem.
              </p>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <li key={step.n} className="border border-border bg-surface p-6">
                  <p className="font-mono text-xs text-accent">{step.n}</p>
                  <h3 className="mt-3 text-lg font-medium text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="demo-heading">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">Live demo strip</p>
                <h2 id="demo-heading" className="mt-2 font-display text-3xl tracking-tight text-fg sm:text-4xl">
                  What the agent will try
                </h2>
              </div>
              <Link
                to="/console"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-fg underline decoration-accent decoration-2 underline-offset-8"
              >
                Open console
                <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {beats.map((beat) => {
                const Icon = beat.icon;
                return (
                  <article key={beat.name} className="border border-border bg-surface p-5">
                    <div className={`flex size-10 items-center justify-center ${beat.tone}`}>
                      <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    </div>
                    <p className="mt-5 font-mono text-3xl font-medium tabular-nums tracking-tight">{beat.amount}</p>
                    <h3 className="mt-2 text-lg font-medium">{beat.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{beat.line}</p>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-muted">
              Demo mandate: $25 max / payment · $50 / day · approve above $10 · USDC · recipients vendor.near,
              studio.near, and one EVM address. Press Run the agent in the console — you do not type the four
              bodies.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="why-heading">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-3">
            <div>
              <h2 id="why-heading" className="font-display text-2xl tracking-tight text-fg sm:text-3xl">
                Why prompts fail
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                A system prompt is a request, not a lock. Agents that hold raw keys are steerable by injection,
                poisoned tools, and malicious 402 / MCP text.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">What Mandate locks</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Caps, day remaining, allow-list, and the approval line live outside the model. Jailbreak fields
                <span className="font-mono text-fg"> approved </span>
                and
                <span className="font-mono text-fg"> policy </span>
                are ignored.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">Settlement path</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Receipts follow the NEAR Intents 1-Click shape. Production targets OutLayer Agent Custody. This
                preview does not broadcast and does not invent a transaction hash.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-fg text-bg" aria-labelledby="cta-heading">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
            <div className="max-w-xl">
              <h2 id="cta-heading" className="font-display text-3xl tracking-tight sm:text-4xl">
                Run the gate. Read the rules.
              </h2>
              <p className="mt-3 text-sm leading-6 text-bg/70">
                Clone-free path for judges: open the console, press Run the agent, approve the hold, inspect the
                receipt. Litepaper on /docs. Machine contract on /llms.txt.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/console"
                className="inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
              >
                Open console
              </Link>
              <Link
                to="/docs"
                className="inline-flex h-11 items-center border border-bg/30 px-5 text-sm font-medium text-bg transition-colors duration-150 hover:border-bg"
              >
                Litepaper
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
