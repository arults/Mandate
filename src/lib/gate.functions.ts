import { createServerFn } from "@tanstack/react-start";

import { awaitGateReady, fundWallet, prepareDemo, publishPolicy, resolveApproval, snapshot, submitPayment } from "@/lib/gate.server";
import { parsePolicy } from "@/lib/policy";

export const getGate = createServerFn({ method: "GET" }).handler(async () => awaitGateReady());

export const savePolicy = createServerFn({ method: "POST" })
  .validator((data: unknown) => parsePolicy(data))
  .handler(async ({ data }) => publishPolicy(data));

export const prepareDemoGate = createServerFn({ method: "POST" })
  .validator((data: unknown) => parsePolicy(data))
  .handler(async ({ data }) => prepareDemo(data));

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
  .handler(async ({ data }) => fundWallet(data.amountUsd, data.mode));

export const requestPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("Payment request must be an object");
    return data;
  })
  .handler(async ({ data }) => {
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
    const receipt = await resolveApproval(data.id, data.action);
    return { receipt, gate: snapshot() };
  });

