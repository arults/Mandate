import { createFileRoute } from "@tanstack/react-router";

import { submitPayment } from "@/lib/gate.server";

export const Route = createFileRoute("/api/v1/pay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const receipt = await submitPayment(body);
          return Response.json({ receipt }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Could not evaluate payment";
          const status = detail.startsWith("No policy") ? 409 : 400;
          return Response.json(
            { error: status === 409 ? "no_policy" : "bad_request", detail },
            { status, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
