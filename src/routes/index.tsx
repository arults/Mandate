import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/components/home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Mandate — spending rules for AI that pay" },
      {
        name: "description",
        content: "You set spending rules. Your AI asks to pay vendors — without your keys. Clever prompts cannot drain the wallet.",
      },
    ],
  }),
});
