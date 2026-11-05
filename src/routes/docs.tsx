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
          "How the travel desk works: spending limits, who can be paid, ask you first, and Freeze. The helper can ask. This demo does not send money.",
      },
    ],
  }),
});
