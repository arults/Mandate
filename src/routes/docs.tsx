import { createFileRoute } from "@tanstack/react-router";

import { Docs } from "@/components/docs";

export const Route = createFileRoute("/docs")({
  component: Docs,
  head: () => ({
    meta: [
      { title: "Docs · Mandate" },
      {
        name: "description",
        content: "How Mandate decides a payment, for the human who sets the policy and the agent who asks.",
      },
    ],
  }),
});
