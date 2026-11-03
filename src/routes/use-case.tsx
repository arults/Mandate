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
          "Version 1 use case: a company-of-one travel founder. USD caps, hotel / airline / rides, hold, and Freeze. The agent only asks to pay.",
      },
    ],
  }),
});
