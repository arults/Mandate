import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/components/home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Mandate — you set the spending limits" },
      {
        name: "description",
        content:
          "A one-person travel desk. You set the spending limit and who can be paid. A helper can ask. This demo does not send money.",
      },
    ],
  }),
});
