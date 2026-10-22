import { createFileRoute } from "@tanstack/react-router";

import { Docs } from "@/components/docs";

export const Route = createFileRoute("/docs")({
  component: Docs,
  head: () => ({
    meta: [
      { title: "Litepaper · Mandate" },
      {
        name: "description",
        content:
          "Mandate litepaper: policy-protected agent wallet for NEAR — architecture, threat model, agent contract, and preview limits.",
      },
    ],
  }),
});
