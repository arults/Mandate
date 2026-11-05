import { createFileRoute } from "@tanstack/react-router";

import { UseCase } from "@/components/use-case";

export const Route = createFileRoute("/use-case")({
  component: UseCase,
  head: () => ({
    meta: [
      { title: "Use Case · Mandate" },
      {
        name: "description",
        content:
          "Who this is for: a one-person travel business. Spending limits, who can be paid, ask you first, and Freeze. The helper can ask. This demo does not send money.",
      },
    ],
  }),
});
