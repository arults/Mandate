import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

/**
 * Travel photographs are Unsplash License stock, not another company's assets.
 * hero-hotel photo-1551882547-ff40c63fe5fa
 * answer-hotel photo-1618773928121-c32242e63f39
 * answer-airline photo-1436491865332-7a61a109cc05
 * answer-ride photo-1449965408869-eaa3f722e40d
 * stay photo-1611892440504-42a792e24d32
 */

const answers = [
  {
    kicker: "Hotel",
    label: "Yes",
    tone: "text-allow",
    body: "Inside your spending limit, and the name is someone you can pay. Not sent yet.",
    src: "/photos/answer-hotel.jpg",
    alt: "A quiet hotel room with the curtains open.",
  },
  {
    kicker: "Airline",
    label: "Ask you",
    tone: "text-fg",
    body: "Over the line you set. Nothing moves until you say yes.",
    src: "/photos/answer-airline.jpg",
    alt: "An airplane wing above the clouds at sunrise.",
  },
  {
    kicker: "Ride",
    label: "No",
    tone: "text-deny",
    body: "Over the limit, or a name you did not allow. A fake look-alike is a no.",
    src: "/photos/answer-ride.jpg",
    alt: "A person at the wheel of a car at dusk.",
  },
];

const primaryCta =
  "inline-flex h-11 items-center gap-2 bg-fg px-5 text-sm font-medium text-bg transition-colors duration-150 hover:bg-fg/90";
const secondaryCta =
  "inline-flex h-11 items-center gap-2 border border-fg bg-bg px-5 text-sm font-medium text-fg transition-colors duration-150 hover:bg-elevated";

export function Home() {
  return (
    <>
      <SiteNav current="home" />
      <main>
        <section className="border-b border-border" aria-labelledby="hero-heading">
          <div className="grid lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(20rem,0.84fr)_minmax(0,1.16fr)]">
            <div className="order-2 flex flex-col justify-center px-5 py-14 sm:px-10 sm:py-20 lg:order-1 lg:px-14 lg:py-16 xl:px-20">
              <div className="max-w-lg">
                <p className="text-sm font-medium text-muted">NEAR hackathon demo</p>
                <h1
                  id="hero-heading"
                  className="mt-4 font-display text-5xl leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl"
                >
                  You set the spending limits.
                </h1>
                <p className="mt-6 text-lg leading-8 text-muted">
                  A helper can ask to pay a hotel, an airline, or a ride. You choose the limit, who
                  can be paid, and when it must ask you first. It cannot send the money.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/console" className={primaryCta}>
                    Try the desk
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </Link>
                  <a href="#travel-demo" className={secondaryCta}>
                    Watch the demo
                  </a>
                </div>
                <p className="mt-10 text-sm text-muted">Who can be paid</p>
                <p className="mt-1 font-mono text-sm text-fg">
                  hotel.near · airline.near · rides.near
                </p>
                <p className="mt-4 text-sm leading-6 text-subtle">
                  This demo checks the rules and does not send money.
                </p>
              </div>
            </div>
            <div className="relative order-1 min-h-[48vh] sm:min-h-[56vh] lg:order-2 lg:min-h-0">
              <img
                src="/photos/hero-hotel.jpg"
                alt="A calm hotel courtyard at dusk, the kind of stay this desk can pay for."
                width={2000}
                height={1334}
                className="absolute inset-0 h-full w-full object-cover object-[62%_46%]"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="answers-heading">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <h2
              id="answers-heading"
              className="font-display text-4xl tracking-tight text-fg sm:text-5xl"
            >
              Three answers
            </h2>
            <ul className="mt-10 grid gap-10 sm:mt-14 md:grid-cols-3 md:gap-8">
              {answers.map((item) => (
                <li key={item.label}>
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1400}
                    height={934}
                    loading="lazy"
                    className="aspect-[3/2] w-full object-cover md:aspect-[4/5]"
                  />
                  <p className="mt-4 text-sm text-muted">{item.kicker}</p>
                  <p className={`mt-1 font-display text-3xl tracking-tight ${item.tone}`}>
                    {item.label}
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="travel-demo"
          className="scroll-mt-24 border-b border-border"
          aria-labelledby="travel-demo-heading"
        >
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
            <div className="text-center">
              <h2
                id="travel-demo-heading"
                className="font-display text-4xl tracking-tight text-fg sm:text-5xl"
              >
                Watch the travel desk
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted">
                About a minute. Yes under your limit, ask you once, and no to a fake look-alike and
                to too many rides. Then Freeze stops the desk.
              </p>
            </div>
            <div className="mt-10 overflow-hidden rounded-card border border-border bg-bg">
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
            <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-6 text-subtle">
              This recording does not send money. There is no fake payment record. Freeze stops the
              desk in the demo. It does not pause the blockchain.
            </p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="who-heading">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <img
              src="/photos/stay.jpg"
              alt="A hotel room at night, with the garden outside the glass."
              width={1400}
              height={1260}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
            />
            <div className="flex flex-col gap-12">
              <div>
                <h2
                  id="who-heading"
                  className="font-display text-4xl tracking-tight text-fg sm:text-5xl"
                >
                  Who it is for
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-muted">
                  You run a one-person travel business. A helper does the busywork and sometimes
                  needs to pay someone. You keep the say-so.
                </p>
              </div>
              <div>
                <h2 className="font-display text-4xl tracking-tight text-fg sm:text-5xl">
                  The problem
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-muted">
                  If the helper can send your money, a clever message can talk it into paying the
                  wrong person. A rule typed into a chat is only a request. Mandate keeps the lock
                  outside the helper.
                </p>
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-3xl px-5 pb-16 sm:pb-24">
            <h3 className="text-center font-display text-3xl tracking-tight text-fg sm:text-4xl">
              Who, the problem, and the lock
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-center text-base leading-7 text-muted">
              About a minute. Who it is for, why a chat rule is not a lock, then the spending limits
              kept outside the helper. This recording does not send money.
            </p>
            <div className="mt-8 overflow-hidden rounded-card border border-border bg-bg">
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
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
