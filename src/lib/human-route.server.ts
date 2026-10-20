import { timingSafeEqual } from "node:crypto";

function headerMatches(header: string | null, token: string): boolean {
  if (!header) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function refuseHumanRoute(request: Request): Response | null {
  const token = process.env.MANDATE_HUMAN_TOKEN;
  if (!token) {
    return Response.json(
      {
        error: "human_route_closed",
        detail:
          "Policy, funding, and approvals are console-only unless MANDATE_HUMAN_TOKEN is set on the server.",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!headerMatches(request.headers.get("x-mandate-human"), token)) {
    return Response.json(
      {
        error: "human_auth",
        detail: "This route needs the human token. The agent pay route cannot approve or rewrite policy.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}
