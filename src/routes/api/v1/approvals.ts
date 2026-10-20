import { createFileRoute } from "@tanstack/react-router";

import { resolveApproval } from "@/lib/gate.server";

export const Route = createFileRoute("/api/v1/approvals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { id?: string; action?: string };
          if (!body.id || (body.action !== "approve" && body.action !== "reject")) {
            return Response.json(
              { error: "bad_request", detail: "Approval needs an id and approve or reject" },
              { status: 400 },
            );
          }
          const receipt = await resolveApproval(body.id, body.action);
          return Response.json({ receipt }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Could not resolve approval";
          return Response.json({ error: "not_found", detail }, { status: 404 });
        }
      },
    },
  },
});
