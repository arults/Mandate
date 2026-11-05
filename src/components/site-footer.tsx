import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-start sm:justify-between sm:py-16">
        <div className="max-w-sm">
          <p className="font-display text-xl tracking-tight text-fg">Mandate</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Version 1. A one-person travel desk. A helper can ask to pay a hotel, an airline, or a
            ride. You keep the spending limits.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <Link to="/console" className="text-muted hover:text-fg">
            Travel desk
          </Link>
          <Link to="/docs" className="text-muted hover:text-fg">
            Docs
          </Link>
          <a href="/llms.txt" className="text-muted hover:text-fg">
            For agents
          </a>
          <a
            href="https://github.com/arults/Mandate"
            className="text-muted hover:text-fg"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-4 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>Version 1 · demo quote · not sent yet · money is not sent</p>
          <p>Free to copy · the demo is free · sending real money comes later</p>
        </div>
      </div>
    </footer>
  );
}
