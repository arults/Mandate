import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const answers = [
  {
    label: "Yes",
    tone: "text-allow",
    body: "Inside your spending limit, and the name is someone you can pay. Not sent yet.",
  },
  {
    label: "Ask you",
    tone: "text-fg",
    body: "Over the line you set. Nothing moves until you say yes.",
  },
  {
    label: "No",
    tone: "text-deny",
    body: "Over the limit, or a name you did not allow. A fake look-alike is a no.",
  },
];

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section>
          <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-28">
            <p className="text-sm font-medium text-muted">NEAR hackathon demo</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
              You set the spending limits.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted">
              You run a one-person travel business. A helper can ask to pay a hotel, an airline, or a ride. You
              choose the spending limit, who can be paid, and when it must ask you first. The helper can ask. It
              cannot send the money.
            </p>
            <p className="mt-4 text-sm leading-6 text-fg">
              In this demo, who can be paid: hotel.near, airline.near, rides.near.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Open the desk and press Run. In under a minute you will see yes, ask you, and no — including a fake
              look-alike name, and too many rides in one day.
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
              This demo checks the rules and does not send money. There is no fake payment record. Freeze stops
              the desk in the demo. It does not pause the blockchain.
            </p>
          </div>
        </section>

        <section className="border-y border-border" aria-labelledby="answers-heading">
          <div className="mx-auto w-full max-w-3xl px-5 py-10">
            <h2 id="answers-heading" className="font-display text-2xl tracking-tight text-fg sm:text-3xl">
              Three answers
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {answers.map((item) => (
                <li key={item.label} className="border border-border bg-surface p-5">
                  <p className={`text-lg font-medium ${item.tone}`}>{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="travel-demo"
          className="border-b border-border scroll-mt-24"
          aria-labelledby="travel-demo-heading"
        >
          <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-16">
            <div className="text-center">
              <h2
                id="travel-demo-heading"
                className="font-display text-3xl tracking-tight text-fg sm:text-4xl"
              >
                Watch the travel desk
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted">
                About a minute and a half. Spending limits for a hotel, an airline, and rides. The demo says
                yes under your limit, asks you once, and says no to a fake look-alike name and to too many
                rides. Then Freeze stops the desk. The helper can ask. It cannot send the money. This recording
                does not send money.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-card border border-border bg-bg">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/demo/mandate-travel-console-demo-v5-poster.jpg"
                className="aspect-video w-full bg-bg"
              >
                <source src="/demo/mandate-travel-console-demo-v5.mp4" type="video/mp4" />
              </video>
            </div>
            <p className="mt-4 text-center text-sm text-subtle">
              Prefer a direct link?{" "}
              <a
                href="/demo/mandate-travel-console-demo-v5.mp4"
                className="font-medium text-fg underline decoration-border underline-offset-4 transition-colors hover:decoration-fg"
              >
                Open the travel demo
              </a>
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="who-heading">
          <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-16">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h2 id="who-heading" className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
                  Who it is for
                </h2>
                <p className="mt-4 text-base leading-7 text-muted">
                  People running a small business on their own. A helper does the busywork and sometimes needs
                  to pay someone. You want that to move quickly, under the limit you set. You keep the say-so.
                </p>
              </div>
              <div>
                <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">The problem</h2>
                <p className="mt-4 text-base leading-7 text-muted">
                  If the helper can send your money, a clever message can talk it into paying the wrong person.
                  A rule typed into a chat is only a request. It can be ignored. Mandate keeps the lock outside
                  the helper.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-3xl">
              <h3 className="text-center font-display text-2xl tracking-tight text-fg sm:text-3xl">
                Who, the problem, and the lock
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-center text-base leading-7 text-muted">
                About a minute. Who it is for, why a chat rule is not a lock, then spending limits and who can
                be paid — kept outside the helper. The helper can ask. It cannot send the money. This recording
                does not send money.
              </p>
              <div className="mt-6 overflow-hidden rounded-card border border-border bg-bg">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/demo/homepage-who-poster.jpg"
                  className="aspect-video w-full bg-bg"
                >
                  <source src="/demo/homepage-who.mp4" type="video/mp4" />
                </video>
              </div>
              <p className="mt-4 text-center text-sm text-subtle">
                Prefer a direct link?{" "}
                <a
                  href="/demo/homepage-who.mp4"
                  className="font-medium text-fg underline decoration-border underline-offset-4 transition-colors hover:decoration-fg"
                >
                  Open the who and problem video
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
