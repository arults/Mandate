import { createFileRoute } from "@tanstack/react-router";

import { Console } from "@/components/console";

export const Route = createFileRoute("/console")({
  component: Console,
  head: () => ({
    meta: [{ title: "Control panel · Mandate" }],
  }),
});
