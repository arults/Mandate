import { createFileRoute } from "@tanstack/react-router";

import { readJsonBody } from "@/lib/http-body.server";
import { handleMcpMessage, mcpCatalog } from "@/lib/mcp-gate";

const headers = { "Cache-Control": "no-store" };

/** JSON-RPC MCP. Same gate as /api/v1/pay. Not shown on the travel desk. */
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async () => Response.json(mcpCatalog(), { headers }),
      POST: async ({ request }) => {
        const parsed = await readJsonBody(request);
        if (!parsed.ok) return parsed.response;
        const result = await handleMcpMessage(parsed.value);
        if (result.body === null) return new Response(null, { status: result.httpStatus, headers });
        return Response.json(result.body, { status: result.httpStatus, headers });
      },
    },
  },
});
