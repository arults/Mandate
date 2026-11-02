import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const cases = [
  {
    n: "2",
    title: "Hotel and flight booking",
    who: "A lean travel partner, or a founder whose AI books trips",
    situation:
      "The AI finds a hotel, a flight, or a ride and needs to pay a deposit or fare under caps you set — across more than one merchant.",
    help: "Your rules name a USD max per booking, a daily spend limit, an approval line, and the merchants who can be paid (hotel, airline, rides). Asks under the line can move. Asks above it wait for your OK. If a tool says the account moved, the new payee is still checked against that list.",
    outcome:
      "Travel ops: multi-merchant USD rules; poisoned payee blocked. Bookings stay fast when they fit. You only approve what is on hold. In today’s preview, Mandate checks the rules; money is not sent on-chain yet.",
  },
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
  {
    n: "5",
    title: "Insurance premium and claims payout",
    who: "A small agency, MGA, or claims lead whose AI helps with routine payouts",
    situation:
      "The AI needs to pay a premium installment, renew a binder fee, or release a small claim vendor payment or temporary living expense under policy rules.",
    help: "You set caps, who can be paid, and when asks must wait for you. The AI asks to pay; a checker outside the AI allows what fits, holds what is over the line, and leaves a receipt. Keys stay with you.",
    outcome:
      "Routine insurance payouts move under your rules. Unusual amounts wait for your OK. Every ask leaves an audit trail. In today’s preview, Mandate checks the rules; money is not sent on-chain yet.",
  },
];

export function UseCase() {
  return (
    <>
      <SiteNav current="use-case" />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-xl px-5 py-16 text-left sm:py-20">
            <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Where it helps
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              The trip is the one to try: hotel, airline, and rides under caps you set. A swapped payee stays
              blocked. The agent never holds the keys.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="cases-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <h2 id="cases-heading" className="sr-only">
              Use cases
            </h2>
            <ol className="divide-y divide-border border-y border-border">
              {cases.map((c) => (
                <li key={c.title} className="py-8 text-left">
                  <h3 className="font-display text-2xl tracking-tight text-fg">{c.title}</h3>
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
            <p className="text-base text-muted">The travel desk plays the hotel, airline, and blocked payee.</p>
            <Link
              to="/console"
              className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
            >
              Open the travel desk
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
