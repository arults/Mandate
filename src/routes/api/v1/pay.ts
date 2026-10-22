import { createFileRoute } from "@tanstack/react-router";

import { snapshot, submitPayment } from "@/lib/gate.server";
import { readJsonBody } from "@/lib/http-body.server";
import { projectReceipt } from "@/lib/privacy";

export const Route = createFileRoute("/api/v1/pay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = await readJsonBody(request);
          if (!parsed.ok) return parsed.response;
          const receipt = await submitPayment(parsed.value);
          const gate = snapshot();
          // Agent-facing: honor policy.privacyMode (default minimize). Body flags cannot force full.
          const publicReceipt = projectReceipt(receipt, gate.policy, "agent");
          return Response.json(
            { receipt: publicReceipt },
            { headers: { "Cache-Control": "no-store" } },
          );
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
