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
          const noPolicy = detail.startsWith("No policy");
          const conflict = detail.startsWith("Conflict:");
          const status = noPolicy || conflict ? 409 : 400;
          const code = noPolicy ? "no_policy" : conflict ? "conflict" : "bad_request";
          return Response.json(
            { error: code, detail },
            { status, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
