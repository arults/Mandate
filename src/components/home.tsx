import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/site-nav";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-border py-16 sm:py-24" aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="max-w-3xl text-3xl font-medium leading-tight tracking-tight text-fg sm:text-5xl"
      >
        {title}
      </h2>
      <div className="mt-8 max-w-xl space-y-6 text-lg leading-relaxed text-muted">{children}</div>
    </section>
  );
}

const jumps = [
  { href: "#problem", label: "Problem" },
  { href: "#how", label: "How" },
  { href: "#why", label: "Why Mandate" },
  { href: "#safety", label: "Safety" },
];

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main className="mx-auto w-full max-w-6xl px-5">
        <header className="grid items-end gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,22rem)] lg:gap-20 lg:py-32">
          <div>
            <h1 className="max-w-4xl text-5xl font-medium leading-[1.02] tracking-tight text-fg sm:text-7xl">
              The agent can ask.
              <span className="mt-1 block">It cannot sign.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
              A human writes the spending mandate once. The model may request a payment. It cannot approve
              itself, raise the cap, or hold the key.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/console"
                className="inline-flex h-11 items-center bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
              >
                Open the console
              </Link>
              <Link
                to="/docs"
                className="inline-flex h-11 items-center border border-border bg-surface px-4 text-sm font-medium transition-colors duration-150 hover:border-fg"
              >
                Read the docs
              </Link>
            </div>
          </div>

          <aside className="border border-border bg-surface p-6" aria-label="Example of an allowed decision">
            <p className="font-mono text-xs text-muted">Example · not a broadcast</p>
            <p className="mt-8 font-mono text-4xl font-medium tabular-nums tracking-tight text-fg">
              8.00 <span className="text-lg font-normal text-muted">USDC</span>
            </p>
            <dl className="mt-6 space-y-2 font-mono text-sm text-muted">
              <div className="flex justify-between gap-4">
                <dt>to</dt>
                <dd className="text-fg">vendor.near</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>chain</dt>
                <dd className="text-fg">base</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>status</dt>
                <dd className="text-fg">allow</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>submitted</dt>
                <dd className="text-fg">false</dd>
              </div>
            </dl>
            <div className="mandate-rule mt-8 h-0.5 bg-accent" />
            <p className="mt-4 text-sm leading-6 text-muted">
              The gate names a NEAR Intents path. This preview does not broadcast, and it does not invent a
              transaction hash.
            </p>
          </aside>
        </header>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border py-5 text-sm" aria-label="On this page">
          {jumps.map((jump) => (
            <a key={jump.href} href={jump.href} className="text-muted hover:text-fg hover:underline">
              {jump.label}
            </a>
          ))}
        </nav>

        <Section id="problem" title="A prompt is not a lock.">
          <p>
            An agent that holds a raw key can be talked into using it. A jailbreak, a hallucinated recipient,
            or a field named approved is enough. The system prompt will agree.
          </p>
        </Section>

        <Section id="how" title="Something that is not the model decides.">
          <p>You set the mandate: a cap per payment, a cap per day, an allow-list, and a line that needs you.</p>
          <p>The agent submits pay X of Y to Z. The gate answers allow, block, or needs-approval.</p>
          <p>An allowed payment names a NEAR Intents path. Nothing here is signed by the model.</p>
        </Section>

        <Section id="why" title="The refusal is structural.">
          <div className="space-y-8">
            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-medium text-fg">Outside the model.</h3>
              <p className="mt-2">
                The cap is not a sentence in a prompt. Extra fields are ignored, and the receipt lists them.
              </p>
            </div>
            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-medium text-fg">A hold is not a payment.</h3>
              <p className="mt-2">
                Above the line, the balance does not move until you approve. The day is reserved so later asks
                cannot oversubscribe it.
              </p>
            </div>
            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-medium text-fg">One receipt.</h3>
              <p className="mt-2">
                Allow, block, or needs-approval. settlement.submitted stays false unless a later integration
                chooses to broadcast.
              </p>
            </div>
          </div>
        </Section>

        <Section id="safety" title="Fail closed.">
          <p>A lookalike recipient cannot be saved. Dust under one cent cannot come back as an allow.</p>
          <p>
            If a settlement check says it would not succeed, nothing is spent. If the check cannot be reached,
            the same request can be tried again. It is not stored as a yes.
          </p>
          <p>
            Freeze, or the UTC day turning, drops anything still waiting. The agent’s pay route cannot rewrite
            the policy or approve itself.
          </p>
        </Section>

        <footer className="border-t border-border py-10 text-sm text-muted">
          <p>Mandate. A policy-protected agent wallet. Part of FORGE.</p>
          <p className="mt-2">
            Agents:{" "}
            <a href="/llms.txt" className="text-fg underline">
              /llms.txt
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
