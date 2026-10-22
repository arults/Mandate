import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-xl tracking-tight text-fg">Mandate</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The agent can ask. It cannot sign. Preview gate for NEAR Intents settlement — process memory, not
            broadcast.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <Link to="/docs" className="text-muted hover:text-fg">
            Litepaper
          </Link>
          <Link to="/console" className="text-muted hover:text-fg">
            Console
          </Link>
          <a href="/llms.txt" className="text-muted hover:text-fg">
            Agent contract
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
          <p>FORGE · arults · NEAR HACKATHON 2026</p>
          <p>No TEE claim without OutLayer would_succeed. No invented tx hash.</p>
        </div>
      </div>
    </footer>
  );
}
