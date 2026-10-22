import { Link } from "@tanstack/react-router";

export function SiteNav({ current }: { current: "home" | "docs" | "console" }) {
  const item = (on: boolean) =>
    on
      ? "text-fg underline decoration-accent decoration-2 underline-offset-[10px]"
      : "text-muted transition-colors duration-150 hover:text-fg";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center border border-fg bg-fg"
            >
              <span className="block h-2.5 w-2.5 bg-accent" />
            </span>
            <span className="font-display text-xl leading-none tracking-tight text-fg">Mandate</span>
          </Link>
          <span className="hidden rounded-control border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
            NEAR HACKATHON 2026
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm sm:gap-6" aria-label="Site">
          <Link to="/" className={item(current === "home")}>
            Home
          </Link>
          <Link to="/docs" className={item(current === "docs")}>
            Docs
          </Link>
          <Link
            to="/console"
            className={
              current === "console"
                ? "inline-flex h-9 items-center bg-fg px-3 text-sm font-medium text-bg"
                : "inline-flex h-9 items-center border border-border bg-surface px-3 text-sm font-medium text-fg transition-colors duration-150 hover:border-fg"
            }
          >
            Console
          </Link>
        </nav>
      </div>
    </header>
  );
}
