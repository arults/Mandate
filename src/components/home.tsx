import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const asks = [
  { who: "Hotel", amount: "$80", cue: "Airport night · hotel.near · under the line", outcome: "Allowed" },
  { who: "Airline", amount: "$250", cue: "Flight deposit · airline.near · over the line", outcome: "On hold" },
  { who: "Hotel", amount: "$500", cue: "Over the $300 cap · hotel.near", outcome: "Blocked" },
  { who: "Poisoned payee", amount: "$80", cue: "Account moved · not on the list", outcome: "Blocked" },
];

const steps = [
  { title: "Caps", body: "Per payment, per day, and the line where you have to approve. Hotel, airline, and rides are the list." },
  { title: "The agent asks", body: "It can request a payment. It never holds the keys, and it cannot approve itself." },
  { title: "Allow, hold, or block", body: "Under the line can pass. Over the line waits for you. A swapped payee is blocked." },
];

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-24">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
              You set the caps.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              A travel-ops spending desk. Hotel, airline, and rides can ask. The rules sit outside the model. A
              swapped payee is blocked. They never hold the keys.
            </p>
            <p className="mt-4 text-sm leading-6 text-fg">
              $300 per payment, $800 a day, you approve above $150. This is not a vault and not a chain broadcast.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to="/console"
                className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
              >
                Open the travel desk
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
              <a href="#travel-demo" className="text-sm font-medium text-fg underline decoration-border underline-offset-4 hover:decoration-fg">
                Watch the trip
              </a>
            </div>
            <p className="mt-5 max-w-md text-sm leading-6 text-subtle">
              Preview. Payments are checked, not sent on-chain. No fake transaction hashes.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="folio-heading">
          <div className="mx-auto w-full max-w-xl px-5 py-14 sm:py-16">
            <h2 id="folio-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
              What the desk checks
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              One trip. Four asks. Rides stays on the list and is not asked in this run.
            </p>
            <ol className="mt-8 divide-y divide-border border-y border-border">
              {asks.map((ask) => (
                <li key={`${ask.who}-${ask.amount}-${ask.cue}`} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium text-fg">{ask.who}</p>
                    <p className="font-mono text-sm tabular-nums text-fg">{ask.amount}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">{ask.cue}</p>
                  <p className="mt-2 text-sm font-medium text-fg">{ask.outcome}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-6 text-subtle">
              These are the checks the desk will show. Money is not sent. No transaction hash is invented.
            </p>
            <h3 className="mt-10 text-sm font-medium text-fg">What this preview does not do</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              <li>It does not broadcast, and it does not prove a TEE.</li>
              <li>A sleeping server can forget the desk. That is not a chain record.</li>
              <li>
                Next, not now: OutLayer can hold the keys. A Function Call Key can only request. This page stays the
                rules.
              </li>
            </ul>
          </div>
        </section>

        <section id="how" className="border-b border-border scroll-mt-24" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-xl px-5 py-14 sm:py-16">
            <h2 id="how-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
              How it works
            </h2>
            <ol className="mt-8 divide-y divide-border border-y border-border">
              {steps.map((step) => (
                <li key={step.title} className="py-4">
                  <h3 className="text-base font-medium text-fg">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="travel-demo" className="border-b border-border scroll-mt-24" aria-labelledby="travel-demo-heading">
          <div className="mx-auto w-full max-w-xl px-5 py-14 sm:py-16">
            <h2 id="travel-demo-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
              The same trip, on a reel
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Caps, then the agent, then an allow, a hold you approve, and a blocked payee. On the desk, Run
              travel agent plays it live. Money is not sent.
            </p>
            <div className="mt-6 overflow-hidden border border-border bg-bg">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/demo/mandate-travel-console-demo-v3-poster.jpg"
                className="aspect-video w-full bg-bg"
              >
                <source src="/demo/mandate-travel-console-demo-v3.mp4" type="video/mp4" />
              </video>
            </div>
            <p className="mt-4 text-sm text-subtle">
              Prefer a direct link?{" "}
              <a
                href="/demo/mandate-travel-console-demo-v3.mp4"
                className="font-medium text-fg underline decoration-border underline-offset-4 hover:decoration-fg"
              >
                Open the trip reel
              </a>
            </p>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-5 py-14 sm:py-16">
            <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">Open the desk.</h2>
            <p className="text-sm leading-6 text-muted">
              Run the trip, approve the airline hold, and read the block on the swapped payee. This preview stops
              before sending.
            </p>
            <Link
              to="/console"
              className="inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Travel desk
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
