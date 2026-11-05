import assert from "node:assert/strict";
import test from "node:test";

import { prepareDemo, resetGateForTests } from "./gate.server.ts";
import { handleMcpMessage, MCP_NOT_TOOLS, MCP_TOOLS } from "./mcp-gate.ts";

const demo = {
  maxPerTransactionUsd: 25,
  dailyLimitUsd: 50,
  allowedRecipients: ["vendor.near", "studio.near"],
  approvalThresholdUsd: 10,
  allowedAssets: ["USDC"] as ["USDC"],
  frozen: false,
};

function call(name: string, args: Record<string, unknown>, id = 1) {
  return handleMcpMessage({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  });
}

function toolText(body: unknown): Record<string, unknown> {
  const result = (body as { result: { content: Array<{ text: string }>; isError?: boolean } }).result;
  return { ...JSON.parse(result.content[0]!.text), isError: result.isError === true };
}

test.beforeEach(async () => {
  await resetGateForTests();
});

test("tools/list exposes pay and receipt and not the human routes", async () => {
  const listed = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const tools = (listed.body as { result: { tools: Array<{ name: string }> } }).result.tools.map((tool) => tool.name);
  assert.deepEqual(tools, MCP_TOOLS.map((tool) => tool.name));
  const toolSet = new Set<string>(tools);
  assert.equal(toolSet.has("mandate_pay"), true);
  assert.equal(toolSet.has("mandate_receipt"), true);
  for (const route of MCP_NOT_TOOLS) assert.equal(toolSet.has(route), false);
  assert.equal(toolSet.has("mandate_policy"), false);
});

test("mandate_pay without a policy returns no_policy and does not invent one", async () => {
  const response = await call("mandate_pay", {
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "invoice",
  });
  const body = toolText(response.body);
  assert.equal(body.isError, true);
  assert.equal(body.error, "no_policy");
  assert.equal(body.httpStatus, 409);
});

test("mandate_pay returns the gate receipt and mandate_receipt reads it back", async () => {
  await prepareDemo(demo);
  const paid = await call("mandate_pay", {
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "API invoice 14",
    idempotencyKey: "invoice-14",
  });
  const payBody = toolText(paid.body);
  assert.equal(payBody.isError, false);
  const receipt = payBody.receipt as {
    id: string;
    status: string;
    settlement: { submitted: boolean } | null;
  };
  assert.equal(receipt.status, "allow");
  assert.equal(receipt.settlement?.submitted, false);
  assert.equal("txHash" in (receipt.settlement ?? {}), false);
  assert.match(String(payBody.note), /Not a TEE/);

  const again = await call("mandate_receipt", { id: receipt.id }, 2);
  const read = toolText(again.body);
  assert.equal(read.isError, false);
  assert.equal((read.receipt as { id: string; status: string }).id, receipt.id);
  assert.equal((read.receipt as { settlement: { submitted: boolean } }).settlement.submitted, false);
});

test("a human route name is not a tool", async () => {
  const response = await call("mandate_policy", {});
  const body = toolText(response.body);
  assert.equal(body.isError, true);
  assert.equal(body.error, "unknown_tool");
  assert.deepEqual(body.notTools, MCP_NOT_TOOLS);
});
