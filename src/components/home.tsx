import { Link } from "@tanstack/react-router";
import { Ban, Check, Clock, ShieldOff } from "lucide-react";

import { SiteNav } from "@/components/site-nav";

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
      <main className="mx-auto w-full max-w-6xl px-5">
        <header className="py-14 sm:py-20">
          <h1 className="max-w-4xl text-5xl font-medium leading-[1.02] tracking-tight text-fg sm:text-7xl">
            The agent can ask.
            <span className="mt-1 block">It cannot sign.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            You set the mandate. The agent calls one route. The gate answers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/console"
              className="inline-flex h-11 items-center bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Watch the agent
            </Link>
            <Link
              to="/docs"
              className="inline-flex h-11 items-center border border-border bg-surface px-4 text-sm font-medium transition-colors duration-150 hover:border-fg"
            >
              Rules
            </Link>
          </div>
        </header>

        <section aria-label="What the agent will try">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {beats.map((beat) => {
              const Icon = beat.icon;
              return (
                <article key={beat.name} className="border border-border bg-surface p-5">
                  <div className={`flex size-11 items-center justify-center ${beat.tone}`}>
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-5 font-mono text-3xl font-medium tabular-nums tracking-tight">{beat.amount}</p>
                  <h2 className="mt-2 text-lg font-medium">{beat.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{beat.line}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 grid gap-8 border-t border-border py-12 sm:grid-cols-3">
          <div>
            <h2 className="text-xl font-medium">Problem</h2>
            <p className="mt-2 text-muted">A prompt is not a lock. A raw key can be talked into a different recipient.</p>
          </div>
          <div>
            <h2 className="text-xl font-medium">How</h2>
            <p className="mt-2 text-muted">
              Cap, day, allow-list, and a line that needs you. The model does not get a vote.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-medium">Safety</h2>
            <p className="mt-2 text-muted">
              This preview keeps the mandate in one process. It does not broadcast, and it does not invent a
              transaction hash.
            </p>
          </div>
        </section>

        <footer className="border-t border-border py-10 text-sm text-muted">
          <p>Mandate. The agent posts to /api/v1/pay. It cannot rewrite the mandate.</p>
          <p className="mt-2">
            <a href="/llms.txt" className="text-fg underline">
              Agent contract
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
