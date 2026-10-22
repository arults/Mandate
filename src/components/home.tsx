import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const steps = [
  { n: "1", title: "You set the mandate", body: "Cap, daily limit, allow-list, approval line. Once." },
  { n: "2", title: "Agent asks to pay", body: "One route: POST /api/v1/pay. No key. No rewrite." },
  { n: "3", title: "The gate decides", body: "allow · hold · reject — outside the model." },
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
            <p className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Policy gate for agent spend
            </p>
            <h1 className="mt-7 font-display text-[2.75rem] leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl">
              The agent can ask.
              <span className="mt-1 block text-muted">It cannot sign.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              You set the spending mandate. Agents propose. A gate outside the model returns allow, hold, or
              reject.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/console"
                className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
              >
                Try the console
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
              <Link
                to="/docs"
                className="inline-flex h-11 items-center border border-border bg-surface px-5 text-sm font-medium transition-colors duration-150 hover:border-fg"
              >
                Docs
              </Link>
            </div>
            <p className="mt-5 text-sm text-subtle">Preview · not broadcast · no invented tx hash</p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <h2 id="how-heading" className="sr-only">
              How it works
            </h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <li key={step.n} className="border border-border bg-surface p-6 text-left">
                  <p className="font-mono text-xs text-accent">{step.n}</p>
                  <h3 className="mt-3 text-lg font-medium text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-center text-sm text-muted">
              Jailbreak fields like <span className="font-mono text-fg">approved: true</span> are ignored. Caps
              live outside the model.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-label="Demo outcomes">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-5 py-12 sm:flex-row sm:justify-between sm:py-14">
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-sm text-muted sm:justify-start">
              <li>
                <span className="text-allow">allow</span> under the line
              </li>
              <li className="text-subtle" aria-hidden="true">
                ·
              </li>
              <li>
                <span className="text-hold">hold</span> needs you
              </li>
              <li className="text-subtle" aria-hidden="true">
                ·
              </li>
              <li>
                <span className="text-deny">reject</span> over the cap
              </li>
            </ul>
            <Link
              to="/console"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-fg underline decoration-accent decoration-2 underline-offset-8"
            >
              Run the agent
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </section>

        <section className="bg-fg text-bg" aria-labelledby="cta-heading">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
            <div className="max-w-lg">
              <h2 id="cta-heading" className="font-display text-3xl tracking-tight sm:text-4xl">
                Open the console.
              </h2>
              <p className="mt-2 text-sm leading-6 text-bg/70">
                Press Run the agent. Approve the hold. Inspect the receipt. Built for NEAR Intents settlement —
                preview does not broadcast.
              </p>
            </div>
            <Link
              to="/console"
              className="inline-flex h-11 shrink-0 items-center bg-accent px-5 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Console
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
