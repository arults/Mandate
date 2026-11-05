import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export function UseCase() {
  return (
    <>
      <SiteNav current="use-case" />
      <main>
        <section>
          <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-24">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
              Who this is for
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted">
              You run a one-person travel business. A helper asks to pay a hotel, an airline, or a ride. You
              keep the spending limits, who can be paid, when it must ask you first, and Freeze.
            </p>
            <dl className="mt-10 divide-y divide-border border-y border-border text-sm leading-6">
              <div className="py-4">
                <dt className="font-medium text-fg">The job</dt>
                <dd className="mt-1 text-muted">Let the helper ask. Do not let it send the money.</dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">The rules</dt>
                <dd className="mt-1 text-muted">
                  Spending limits in dollars. Who can be paid: hotel.near, airline.near, rides.near. Ask you
                  above the line you set. Freeze stops the desk in the demo.
                </dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">The minute</dt>
                <dd className="mt-1 text-muted">
                  Open the desk. Press Run travel agent. Yes for $80. Ask you for $250. No for too much, for a
                  fake look-alike name, and for too many rides.
                </dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">Not this</dt>
                <dd className="mt-1 text-muted">
                  This demo checks the rules and does not send money. There is no fake payment record. Freeze
                  stops the desk here. It does not pause the blockchain.
                </dd>
              </div>
            </dl>
            <Link
              to="/console"
              className="mt-8 inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
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
