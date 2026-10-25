import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const cases = [
  {
    n: "1",
    title: "SaaS tool invoice",
    who: "A solo founder whose AI handles busywork",
    situation:
      "The AI finds a software tool the business needs and gets an invoice for a few hundred dollars.",
    help: "You already set how much can go out per payment and per day, and who can be paid. The AI asks to pay. A checker outside the AI says yes if it fits your rules, or holds it for your OK.",
    outcome:
      "The tool can be paid under your rules. Clever prompts cannot raise the cap or change who gets paid. You keep the keys.",
  },
  {
    n: "2",
    title: "Outdoor program gear",
    who: "An outdoor educator or small program operator",
    situation:
      "An AI helps book gear or a local vendor for a trip and needs to pay a deposit.",
    help: "Your rules name allowed vendors and max amounts. Asks above your line wait for you. Everything under the line can move without you typing each time.",
    outcome:
      "Gear booking stays fast when it fits. You only approve what is on hold. Every ask leaves a receipt you can read.",
  },
  {
    n: "3",
    title: "Freelancer after deliverable",
    who: "A company-of-one shipping with freelancers",
    situation:
      "A deliverable lands. The agent wants to pay the freelancer so work does not stall.",
    help: "Policy can allow small routine pays automatically, and require your approval above a threshold you choose.",
    outcome:
      "Freelancers get paid when your rules say yes. A jailbreak cannot empty the wallet. You can freeze anytime.",
  },
  {
    n: "4",
    title: "Domain or API renewal",
    who: "A founder whose agent handles renewals",
    situation:
      "A domain or API subscription is due. The agent wants to pay before service lapses.",
    help: "A daily limit and an allowlist keep renewals inside a safe band — without handing the agent your wallet keys.",
    outcome:
      "Renewals go through when they fit. You stay in control. In today’s preview, Mandate checks the rules; money is not sent on-chain yet.",
  },
];

export function UseCase() {
  return (
    <>
      <SiteNav current="use-case" />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:py-20">
            <p className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Real-life examples
            </p>
            <h1 className="mt-7 font-display text-[2.5rem] leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Where Mandate helps
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              You set spending rules once. Your AI asks to pay. A checker outside the AI decides —
              yes, ask you first, or no — so the agent never holds your keys.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="cases-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <h2 id="cases-heading" className="sr-only">
              Use cases
            </h2>
            <ol className="grid gap-5 sm:grid-cols-2">
              {cases.map((c) => (
                <li key={c.n} className="border border-border bg-surface p-6 text-left sm:p-7">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">{c.n}</p>
                  <h3 className="mt-3 font-display text-2xl tracking-tight text-fg">{c.title}</h3>
                  <dl className="mt-5 space-y-4 text-sm leading-6 text-muted">
                    <div>
                      <dt className="font-medium text-fg">Who</dt>
                      <dd className="mt-1">{c.who}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-fg">Situation</dt>
                      <dd className="mt-1">{c.situation}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-fg">How Mandate helps</dt>
                      <dd className="mt-1">{c.help}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-fg">Outcome</dt>
                      <dd className="mt-1">{c.outcome}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-2xl text-sm text-subtle">
              Preview demo — payments are checked, not sent on-chain yet. No fake transaction hashes.
            </p>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-5 py-14 text-center sm:py-16">
            <p className="text-base text-muted">Ready to try the control panel?</p>
            <Link
              to="/console"
              className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
            >
              Open the control panel
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
