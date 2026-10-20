import { Link } from "@tanstack/react-router";

export function SiteNav({ current }: { current: "home" | "docs" | "console" }) {
  const item = (on: boolean) =>
    on
      ? "text-fg underline decoration-accent decoration-2 underline-offset-8"
      : "text-muted transition-colors duration-150 hover:text-fg";

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5">
        <Link to="/" className="text-base font-medium tracking-tight">
          Mandate
        </Link>
        <nav className="flex items-center gap-6 text-sm" aria-label="Site">
          <Link to="/docs" className={item(current === "docs")}>
            Docs
          </Link>
          <Link to="/console" className={item(current === "console")}>
            Console
          </Link>
        </nav>
      </div>
    </header>
  );
}
