import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/components/home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Mandate" },
      {
        name: "description",
        content: "The agent can ask. It cannot sign. A human sets the spending mandate once.",
      },
    ],
  }),
});
