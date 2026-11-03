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
          "Version 1 litepaper for the travel desk: caps, allow-list, hold, and Freeze. Not an FCK vault, a TEE, or a scam registry.",
      },
    ],
  }),
});
