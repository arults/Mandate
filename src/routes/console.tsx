import { createFileRoute } from "@tanstack/react-router";

import { Console } from "@/components/console";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/console")({
  component: function ConsolePage() {
    return (
      <>
        <SiteNav current="console" />
        <Console />
      </>
    );
  },
  head: () => ({
    meta: [{ title: "Console · Mandate" }],
  }),
});
