import { createServerFn } from "@tanstack/react-start";

import { awaitGateReady, fundWallet, prepareDemo, publishPolicy, resolveApproval, runDemoAgentFlow, snapshot, submitPayment } from "@/lib/gate.server";
import { assertHumanServerFn } from "@/lib/human-route.server";
import type { AgentBeat, AgentScript } from "@/lib/agent-script";
import { DEMO_POLICY, parsePolicy, TRAVEL_POLICY } from "@/lib/policy";

export const getGate = createServerFn({ method: "GET" }).handler(async () => {
  assertHumanServerFn();
  return awaitGateReady();
});

export const savePolicy = createServerFn({ method: "POST" })
  .validator((data: unknown) => parsePolicy(data))
  .handler(async ({ data }) => {
    assertHumanServerFn();
    return publishPolicy(data);
  });

export const prepareDemoGate = createServerFn({ method: "POST" })
  .validator((data: unknown) => parsePolicy(data))
  .handler(async ({ data }) => {
    assertHumanServerFn();
    return prepareDemo(data);
  });

export const addFunds = createServerFn({ method: "POST" })
  .validator((data: { amountUsd?: number; mode?: "add" | "set" }) => {
    const amount = data?.amountUsd;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      throw new Error("Enter a funding amount between 0 and 1,000,000");
    }
    return {
      amountUsd: Math.round(amount * 100) / 100,
      mode: data.mode === "set" ? ("set" as const) : ("add" as const),
    };
  })
  .handler(async ({ data }) => {
    assertHumanServerFn();
    return fundWallet(data.amountUsd, data.mode);
  });

export const requestPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("Payment request must be an object");
    return data;
  })
  .handler(async ({ data }) => {
    // Human console only. Agents must use POST /api/v1/pay (agent-minimized).
    // Without this guard, TanStack RPC returned full purpose/to + full ledger.
    assertHumanServerFn();
    const receipt = await submitPayment(data);
    return { receipt, gate: snapshot() };
  });

function approvalAction(value: string | undefined): "approve" | "reject" {
  if (value === "approve" || value === "reject") return value;
  throw new Error("Approval needs an id and approve or reject");
}

export const decideApproval = createServerFn({ method: "POST" })
  .validator((data: { id?: string; action?: string }) => {
    if (!data?.id) throw new Error("Approval needs an id and approve or reject");
    return { id: data.id, action: approvalAction(data.action) };
  })
  .handler(async ({ data }) => {
    assertHumanServerFn();
    const receipt = await resolveApproval(data.id, data.action);
    return { receipt, gate: snapshot() };
  });

export const runDemoAgent = createServerFn({ method: "POST" })
  .validator((data: { policy?: unknown; runId?: string; script?: string; only?: string } | unknown) => {
    const raw =
      data && typeof data === "object"
        ? (data as { policy?: unknown; runId?: string; script?: unknown; only?: unknown })
        : {};
    const script: AgentScript = raw.script === "travel" ? "travel" : "demo";
    const policy =
      raw.policy === undefined ? (script === "travel" ? TRAVEL_POLICY : DEMO_POLICY) : parsePolicy(raw.policy);
    const runId =
      typeof raw.runId === "string" && raw.runId.trim()
        ? raw.runId.trim().slice(0, 32)
        : crypto.randomUUID().slice(0, 8);
    const onlyIds: AgentBeat["id"][] = ["allow", "hold", "block", "jailbreak", "poison", "burst"];
    const only = onlyIds.find((id) => id === raw.only);
    return { policy, runId, script, only };
  })
  .handler(async ({ data }) => {
    assertHumanServerFn();
    // Strip beat.body: Record<string, unknown> is not TanStack-serializable.
    // Console only needs id/title/says + the privacy-minimized receipt.
    const out = await runDemoAgentFlow(data.policy, data.runId, data.script, data.only);
    return {
      gate: out.gate,
      receipts: out.receipts,
      results: out.results.map(({ beat, receipt, legs }) => ({
        beat: { id: beat.id, title: beat.title, says: beat.says },
        receipt,
        legs,
      })),
    };
  });

