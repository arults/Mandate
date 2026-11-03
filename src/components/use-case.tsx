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
              A company-of-one travel or ops founder. The agent asks to pay hotels, airlines, and rides in USD. Caps,
              an allow-list, a hold, and Freeze stay with you.
            </p>
            <dl className="mt-10 divide-y divide-border border-y border-border text-sm leading-6">
              <div className="py-4">
                <dt className="font-medium text-fg">The job</dt>
                <dd className="mt-1 text-muted">Let the agent ask. Do not hand it keys, and do not deploy a vault.</dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">The rules</dt>
                <dd className="mt-1 text-muted">
                  USD caps. Allow-list: hotel.near, airline.near, rides.near. Hold above the line. Freeze the desk.
                </dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">The minute</dt>
                <dd className="mt-1 text-muted">
                  Cold open the desk. Run travel agent. Allow $80, hold $250, block the over-cap, the look-alike, and
                  the ride burst.
                </dd>
              </div>
              <div className="py-4">
                <dt className="font-medium text-fg">Not this</dt>
                <dd className="mt-1 text-muted">
                  Not an FCK vault, a TEE, or a scam registry. Dry quotes. submitted false. No invented transaction.
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
