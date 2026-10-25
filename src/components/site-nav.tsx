import { Link } from "@tanstack/react-router";

export function SiteNav({ current }: { current: "home" | "use-case" | "docs" | "console" }) {
  const item = (on: boolean) =>
    on
      ? "shrink-0 whitespace-nowrap text-fg underline decoration-accent decoration-2 underline-offset-8 sm:underline-offset-[10px]"
      : "shrink-0 whitespace-nowrap text-muted transition-colors duration-150 hover:text-fg";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
          <Link to="/" className="group flex items-center gap-2 sm:gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center border border-fg bg-fg sm:size-7"
            >
              <span className="block h-2 w-2 bg-accent sm:h-2.5 sm:w-2.5" />
            </span>
            <span className="font-display text-lg leading-none tracking-tight text-fg sm:text-xl">
              Mandate
            </span>
          </Link>
          <span className="hidden rounded-control border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted sm:inline">
            NEAR HACKATHON 2026
          </span>
        </div>
        <nav
          className="flex min-w-0 items-center gap-2.5 overflow-x-auto text-xs [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 sm:overflow-visible sm:text-sm [&::-webkit-scrollbar]:hidden"
          aria-label="Site"
        >
          <Link to="/" className={item(current === "home")}>
            Home
          </Link>
          <Link to="/use-case" className={item(current === "use-case")}>
            Use Case
          </Link>
          <Link to="/docs" className={item(current === "docs")}>
            Docs
          </Link>
          <Link
            to="/console"
            aria-label="Control panel"
            title="Control panel"
            className={
              current === "console"
                ? "inline-flex h-8 shrink-0 items-center whitespace-nowrap bg-fg px-2.5 text-xs font-medium text-bg sm:h-9 sm:px-3 sm:text-sm"
                : "inline-flex h-8 shrink-0 items-center whitespace-nowrap border border-border bg-surface px-2.5 text-xs font-medium text-fg transition-colors duration-150 hover:border-fg sm:h-9 sm:px-3 sm:text-sm"
            }
          >
            <span className="sm:hidden">Panel</span>
            <span className="hidden sm:inline">Control panel</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
