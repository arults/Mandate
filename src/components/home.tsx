import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const steps = [
  {
    n: "1",
    title: "You write the rules once",
    body: "How much can go out per payment and per day. Who can be paid. When you must approve first.",
  },
  {
    n: "2",
    title: "Your AI asks to pay",
    body: "It can request a payment to a vendor. It never holds your wallet keys.",
  },
  {
    n: "3",
    title: "A separate checker decides",
    body: "Not the AI. It says yes, ask you first, or no — using only the rules you set.",
  },
  {
    n: "4",
    title: "You stay in control",
    body: "Approve what is on hold. Freeze anytime. Every ask leaves a receipt you can read.",
  },
];

const outcomes = [
  { label: "Yes", hint: "under your limits", tone: "text-allow" },
  { label: "Ask you", hint: "above your line", tone: "text-hold" },
  { label: "No", hint: "over the cap or wrong payee", tone: "text-deny" },
];

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hero-grid opacity-[0.4]"
          />
          <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-20 text-center sm:py-28">
            <p className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Spending rules for AI that pay
            </p>
            <h1 className="mt-7 font-display text-[2.75rem] leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl">
              You set the rules.
              <span className="mt-1 block text-muted">Your AI asks — without your keys.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Mandate lets founders give an AI permission to pay vendors without handing it the wallet.
              Clever prompts cannot raise the cap, change who gets paid, or approve themselves.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/console"
                className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
              >
                Open the control panel
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
              <a
                href="#how"
                className="inline-flex h-11 items-center border border-border bg-surface px-5 text-sm font-medium transition-colors duration-150 hover:border-fg"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 max-w-md text-sm text-subtle">
              Preview demo — payments are checked, not sent on-chain yet. No fake transaction hashes.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="who-heading">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 sm:grid-cols-2 sm:py-16">
            <div>
              <h2 id="who-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
                Who it is for
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                Founders and operators running a lean business — a “company of one” — where an AI handles
                busywork and sometimes needs to pay a vendor. You want speed under the line you draw. You keep
                the keys.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">The problem</h2>
              <p className="mt-4 text-base leading-7 text-muted">
                If the AI holds your wallet keys, a clever message can talk it into sending money. Rules typed
                into a chat are requests, not locks — they can be ignored under pressure. Mandate puts the lock
                outside the AI.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="border-b border-border scroll-mt-24" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <div className="max-w-2xl">
              <h2 id="how-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">
                Four steps. Same idea a judge or a non-technical founder can follow in a few minutes.
              </p>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <li key={step.n} className="border border-border bg-surface p-6 text-left">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">{step.n}</p>
                  <h3 className="mt-3 text-lg font-medium text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-2xl text-sm leading-6 text-muted">
              If the AI tries to claim “already approved” or rewrite your limits, those claims are ignored. Only
              your saved rules count.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="get-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <h2 id="get-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
              What you get
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              <li className="border border-border bg-surface p-6">
                <h3 className="text-lg font-medium text-fg">A control panel</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Set caps, who can be paid, and when you must approve. Freeze everything in one click if you
                  need to.
                </p>
              </li>
              <li className="border border-border bg-surface p-6">
                <h3 className="text-lg font-medium text-fg">Clear outcomes</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Every ask ends as yes, ask you, or no — with a plain-language receipt you can share.
                </p>
              </li>
              <li className="border border-border bg-surface p-6">
                <h3 className="text-lg font-medium text-fg">Honest preview</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  This demo checks payments against your rules. It does not broadcast money on-chain yet. Demo
                  data can reset when the server sleeps.
                </p>
              </li>
            </ul>
            <ul className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {outcomes.map((item, index) => (
                <li key={item.label} className="flex items-center gap-4">
                  {index > 0 && (
                    <span className="text-subtle" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span>
                    <span className={`font-medium ${item.tone}`}>{item.label}</span>
                    <span className="text-subtle"> — {item.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-fg text-bg" aria-labelledby="cta-heading">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
            <div className="max-w-lg">
              <h2 id="cta-heading" className="font-display text-3xl tracking-tight sm:text-4xl">
                Try it in a few minutes.
              </h2>
              <p className="mt-2 text-sm leading-6 text-bg/70">
                Open the control panel, run the demo, approve one hold, and read the receipt. Built toward NEAR
                settlement — this preview stops before sending.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/console"
                className="inline-flex h-11 shrink-0 items-center bg-accent px-5 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
              >
                Control panel
              </Link>
              <Link
                to="/docs"
                className="inline-flex h-11 shrink-0 items-center border border-bg/30 px-5 text-sm font-medium text-bg/80 transition-colors duration-150 hover:border-bg hover:text-bg"
              >
                Docs for builders
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
