import { createFileRoute } from "@tanstack/react-router";

import { fundWallet } from "@/lib/gate.server";
import { refuseHumanRoute } from "@/lib/human-route.server";
import { readJsonBody } from "@/lib/http-body.server";

export const Route = createFileRoute("/api/v1/fund")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = refuseHumanRoute(request);
        if (denied) return denied;
        try {
          const parsed = await readJsonBody(request);
          if (!parsed.ok) return parsed.response;
          const body = parsed.value as { amountUsd?: number; mode?: string };
          const amount = body.amountUsd;
          if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
            return Response.json(
              { error: "bad_request", detail: "Enter a funding amount between 0 and 1,000,000" },
              { status: 400 },
            );
          }
          const mode = body.mode === "set" ? "set" : "add";
          return Response.json(await fundWallet(Math.round(amount * 100) / 100, mode), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Could not fund";
          return Response.json({ error: "bad_request", detail }, { status: 400 });
        }
      },
    },
  },
});
