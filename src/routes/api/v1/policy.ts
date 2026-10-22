import { createFileRoute } from "@tanstack/react-router";

import { awaitGateReady, publishPolicy } from "@/lib/gate.server";
import { refuseHumanRoute } from "@/lib/human-route.server";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/v1/policy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = refuseHumanRoute(request);
        if (denied) return denied;
        return json(await awaitGateReady());
      },
      POST: async ({ request }) => {
        const denied = refuseHumanRoute(request);
        if (denied) return denied;
        try {
          const body = await request.json();
          return json(await publishPolicy(body));
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Could not save policy";
          return json({ error: "bad_policy", detail }, 400);
        }
      },
    },
  },
});
