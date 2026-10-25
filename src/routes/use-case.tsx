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
          "Real-life examples: how founders use Mandate so an AI can ask to pay vendors under rules — without holding the keys.",
      },
    ],
  }),
});
