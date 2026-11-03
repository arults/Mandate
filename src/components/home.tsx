import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section>
          <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-28">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
              You set the caps.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted">
              A company-of-one travel founder lets an agent ask to pay hotels, airlines, and rides in USD. You keep
              the caps, the allow-list, the hold, and Freeze. The agent never gets the keys.
            </p>
            <p className="mt-4 font-mono text-sm leading-6 text-fg">hotel.near · airline.near · rides.near</p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Open the desk and run the travel agent. In under a minute: allow, hold, and block — a look-alike payee
              and a burst of rides.
            </p>
            <div className="mt-8">
              <Link
                to="/console"
                className="inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90"
              >
                Open the travel desk
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-muted">
              Version 1. Dry quotes. submitted false. Not an FCK vault, a TEE, or a scam registry. No invented
              transaction.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
