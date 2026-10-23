import { timingSafeEqual } from "node:crypto";

import { getRequest } from "@tanstack/react-start/server";

function headerMatches(header: string | null, token: string): boolean {
  if (!header) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type HumanAccessMode = "http" | "server-fn";

export type HumanAccessDecision = "allow" | "deny_closed" | "deny_auth";

/**
 * Human-only controls (policy / fund / approvals / prepare-demo).
 *
 * HTTP agent paths stay locked unless MANDATE_HUMAN_TOKEN matches.
 *
 * When MANDATE_HUMAN_TOKEN is set, the matching x-mandate-human header is
 * required for BOTH http and server-fn — Sec-Fetch-Site is NOT auth (clients
 * can forge it) and never bypasses a configured token.
 *
 * When no token is configured, server-fn still soft-allows Sec-Fetch-Site:
 * same-origin so the public console demo works. That heuristic is NOT real
 * auth; agents/curl without it stay deny_closed. Set a token for any shared
 * or production deploy.
 */
export function decideHumanAccess(opts: {
  tokenEnv: string | undefined;
  humanHeader: string | null;
  secFetchSite: string | null;
  mode: HumanAccessMode;
}): HumanAccessDecision {
  const token = opts.tokenEnv?.trim() || undefined;
  if (token) {
    if (headerMatches(opts.humanHeader, token)) return "allow";
    return "deny_auth";
  }
  if (opts.mode === "http") return "deny_closed";
  // Soft demo gate only — not authentication.
  if (opts.secFetchSite === "same-origin") return "allow";
  return "deny_closed";
}

function responseFor(decision: HumanAccessDecision): Response | null {
  if (decision === "allow") return null;
  if (decision === "deny_closed") {
    return Response.json(
      {
        error: "human_route_closed",
        detail:
          "Policy, funding, and approvals are console-only unless MANDATE_HUMAN_TOKEN is set on the server.",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    {
      error: "human_auth",
      detail: "This route needs the human token. The agent pay route cannot approve or rewrite policy.",
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function refuseHumanRoute(request: Request): Response | null {
  return responseFor(
    decideHumanAccess({
      tokenEnv: process.env.MANDATE_HUMAN_TOKEN,
      humanHeader: request.headers.get("x-mandate-human"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      mode: "http",
    }),
  );
}

export class HumanRouteError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "HumanRouteError";
    this.status = status;
    this.code = code;
  }
}

/** Guard for TanStack createServerFn human controls. Throws HumanRouteError. */
export function assertHumanServerFn(): void {
  const request = getRequest();
  const decision = decideHumanAccess({
    tokenEnv: process.env.MANDATE_HUMAN_TOKEN,
    humanHeader: request?.headers.get("x-mandate-human") ?? null,
    secFetchSite: request?.headers.get("sec-fetch-site") ?? null,
    mode: "server-fn",
  });
  if (decision === "allow") return;
  if (decision === "deny_closed") {
    throw new HumanRouteError(
      403,
      "human_route_closed",
      "Policy, funding, and approvals are console-only unless MANDATE_HUMAN_TOKEN is set on the server.",
    );
  }
  throw new HumanRouteError(
    401,
    "human_auth",
    "This route needs the human token. The agent pay route cannot approve or rewrite policy.",
  );
}
