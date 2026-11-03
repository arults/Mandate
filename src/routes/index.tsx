import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/components/home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Mandate — you set the caps" },
      {
        name: "description",
        content:
          "Version 1. A company-of-one travel founder lets an agent ask to pay hotels, airlines, and rides in USD under caps, an allow-list, hold, and Freeze. Not a vault.",
      },
    ],
  }),
});
