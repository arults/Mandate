import { createFileRoute } from "@tanstack/react-router";

import { awaitGateReady, getReceiptById, snapshot } from "@/lib/gate.server";
import { projectReceipt } from "@/lib/privacy";

/**
 * Shareable agent receipt lookup.
 * Returns the stored decision with privacy minimize (same as POST /pay).
 * Not a TEE attestation. Not proof of broadcast. settlement.submitted stays false in preview.
 */
export const Route = createFileRoute("/api/v1/receipt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await awaitGateReady();
        const url = new URL(request.url);
        const id = (url.searchParams.get("id") || "").trim();
        if (!id) {
          return Response.json(
            { error: "bad_request", detail: "Pass ?id=<receiptId> from a prior POST /api/v1/pay response." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        const receipt = await getReceiptById(id);
        if (!receipt) {
          return Response.json(
            {
              error: "not_found",
              detail:
                "No receipt with that id in this gate instance. Cold isolates / Reset demo clear the ledger. Re-run POST /api/v1/pay on a warm instance.",
            },
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        const gate = snapshot();
        const publicReceipt = projectReceipt(receipt, gate.policy, "agent");
        return Response.json(
          {
            receipt: publicReceipt,
            note: "Local policy-gate receipt. Not a TEE attestation. settlement.submitted false means nothing was broadcast.",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
