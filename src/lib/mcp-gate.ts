/**
 * MCP (JSON-RPC) face on the same policy gate as POST /api/v1/pay.
 * Not a second policy, not custody, not a TEE.
 */
import { getReceiptById, snapshot, submitPayment } from "@/lib/gate.server";
import { projectReceipt } from "@/lib/privacy";

export const MCP_PROTOCOL_VERSION = "2024-11-05";

const RECEIPT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HONESTY =
  "Same gate as POST /api/v1/pay. Not a second policy. Not custody. Not a TEE. settlement.submitted false means nothing was broadcast.";

export const MCP_TOOLS = [
  {
    name: "mandate_pay",
    description:
      "Ask the Mandate gate to pay. Same body as POST /api/v1/pay. Returns the decision receipt. Never broadcasts. settlement.submitted stays false. Not a TEE.",
    inputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        amountUsd: { type: "number", description: "USD amount, at least 0.01, at most 2 decimal places." },
        asset: { type: "string", description: "USDC." },
        to: { type: "string", description: "Payee. .near account, 20-byte hex, or base58." },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "solana", "polygon", "near"],
        },
        purpose: { type: "string" },
        idempotencyKey: { type: "string", description: "Optional. Max 80 characters." },
      },
      required: ["amountUsd", "asset", "to", "chain", "purpose"],
    },
  },
  {
    name: "mandate_receipt",
    description:
      "Read a prior decision. Same as GET /api/v1/receipt?id=. Not proof of broadcast. settlement.submitted stays false in this preview.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string", description: "receipt.id from mandate_pay." },
      },
      required: ["id"],
    },
  },
] as const;

/** Human routes. They are not MCP tools. */
export const MCP_NOT_TOOLS = ["/api/v1/policy", "/api/v1/fund", "/api/v1/approvals"] as const;

export function mcpCatalog() {
  return {
    name: "mandate",
    protocol: "mcp",
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: "POST JSON-RPC 2.0",
    note: HONESTY,
    tools: MCP_TOOLS.map((tool) => tool.name),
    notTools: MCP_NOT_TOOLS,
  };
}

type ToolContent = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function textResult(value: unknown, isError = false): ToolContent {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    ...(isError ? { isError: true } : {}),
  };
}

function payError(error: unknown): ToolContent {
  const detail = error instanceof Error ? error.message : "Could not evaluate payment";
  const noPolicy = detail.startsWith("No policy");
  const conflict = detail.startsWith("Conflict:");
  const httpStatus = noPolicy || conflict ? 409 : 400;
  const code = noPolicy ? "no_policy" : conflict ? "conflict" : "bad_request";
  return textResult({ error: code, detail, httpStatus }, true);
}

async function mandatePay(args: unknown): Promise<ToolContent> {
  try {
    const receipt = await submitPayment(args);
    const gate = snapshot();
    const publicReceipt = projectReceipt(receipt, gate.policy, "agent");
    return textResult({ receipt: publicReceipt, note: HONESTY });
  } catch (error) {
    return payError(error);
  }
}

async function mandateReceipt(args: unknown): Promise<ToolContent> {
  const id = args && typeof args === "object" && "id" in args ? String((args as { id: unknown }).id ?? "").trim() : "";
  if (!id) {
    return textResult(
      { error: "bad_request", detail: "Pass id from a prior mandate_pay receipt.", httpStatus: 400 },
      true,
    );
  }
  if (!RECEIPT_ID_RE.test(id)) {
    return textResult(
      { error: "bad_request", detail: "Receipt id must be a UUID from a prior pay response.", httpStatus: 400 },
      true,
    );
  }
  const receipt = await getReceiptById(id);
  if (!receipt) {
    return textResult(
      {
        error: "not_found",
        detail: "No receipt with that id in this gate instance. Cold isolates and Reset demo clear the ledger.",
        httpStatus: 404,
      },
      true,
    );
  }
  const gate = snapshot();
  const publicReceipt = projectReceipt(receipt, gate.policy, "agent", { forceMinimize: true });
  return textResult({
    receipt: publicReceipt,
    note: "Local policy-gate receipt. Not a TEE attestation. settlement.submitted false means nothing was broadcast.",
  });
}

async function callTool(params: unknown): Promise<ToolContent> {
  if (!params || typeof params !== "object") {
    return textResult({ error: "bad_request", detail: "tools/call requires params.name.", httpStatus: 400 }, true);
  }
  const name = (params as { name?: unknown }).name;
  const args = (params as { arguments?: unknown }).arguments ?? {};
  if (name === "mandate_pay") return mandatePay(args);
  if (name === "mandate_receipt") return mandateReceipt(args);
  return textResult(
    {
      error: "unknown_tool",
      detail: "Only mandate_pay and mandate_receipt. Policy, fund, and approvals are not tools.",
      notTools: MCP_NOT_TOOLS,
      httpStatus: 404,
    },
    true,
  );
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export async function handleMcpMessage(raw: unknown): Promise<{ httpStatus: number; body: unknown | null }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { httpStatus: 400, body: rpcError(null, -32600, "Invalid Request") };
  }
  const msg = raw as Record<string, unknown>;
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return { httpStatus: 400, body: rpcError("id" in msg ? msg.id : null, -32600, "Invalid Request") };
  }
  if (!("id" in msg)) {
    return { httpStatus: 202, body: null };
  }
  const id = msg.id;
  try {
    const result = await dispatch(msg.method, msg.params);
    if (result === undefined) {
      return { httpStatus: 200, body: rpcError(id, -32601, "Method not found") };
    }
    return { httpStatus: 200, body: { jsonrpc: "2.0", id, result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return { httpStatus: 200, body: rpcError(id, -32603, message) };
  }
}

async function dispatch(method: string, params: unknown): Promise<unknown | undefined> {
  if (method === "initialize") {
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "mandate", version: "0.1.0" },
      instructions: HONESTY + " Human routes are not tools.",
    };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: MCP_TOOLS };
  if (method === "tools/call") return callTool(params);
  return undefined;
}
