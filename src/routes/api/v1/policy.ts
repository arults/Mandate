import { createFileRoute } from "@tanstack/react-router";

import { publishPolicy, snapshot } from "@/lib/gate.server";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/v1/policy")({
  server: {
    handlers: {
      GET: async () => json(snapshot()),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          return json(publishPolicy(body));
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Could not save policy";
          return json({ error: "bad_policy", detail }, 400);
        }
      },
    },
  },
});
