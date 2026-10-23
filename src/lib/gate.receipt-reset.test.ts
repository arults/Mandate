import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  getReceiptById,
  prepareDemo,
  publishPolicy,
  resetGateForTests,
  runDemoAgentFlow,
  snapshot,
  submitPayment,
} from "./gate.server.ts";
import { DEMO_POLICY } from "./policy.ts";

const demo = { ...DEMO_POLICY };

beforeEach(async () => {
  await resetGateForTests();
});

afterEach(async () => {
  await resetGateForTests();
});

test("prepareDemo / Reset wipes ledger, pending, spend, and republishes policy", async () => {
  await prepareDemo(demo);
  await submitPayment({
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "seed",
    idempotencyKey: "reset-seed-8",
  });
  assert.ok(snapshot().ledger.length >= 1);
  assert.ok((snapshot().spentUsd ?? 0) > 0);

  await prepareDemo(demo);
  const gate = snapshot();
  assert.equal(gate.ledger.length, 0);
  assert.equal(gate.pending.length, 0);
  assert.equal(gate.spentUsd, 0);
  assert.equal(gate.balanceUsd, 200);
  assert.ok(gate.policy);
  assert.equal(gate.policy.frozen, false);
  assert.equal(gate.remainingDailyUsd, 50);
});

test("getReceiptById returns stored allow; freeze rejects and is readable", async () => {
  await prepareDemo(demo);
  const allowed = await submitPayment({
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "lookup",
    idempotencyKey: "receipt-lookup-8",
  });
  assert.equal(allowed.status, "allow");
  const found = await getReceiptById(allowed.id);
  assert.ok(found);
  assert.equal(found!.id, allowed.id);
  assert.equal(found!.status, "allow");
  assert.equal(found!.settlement?.submitted, false);

  await publishPolicy({ ...demo, frozen: true });
  const blocked = await submitPayment({
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "while frozen",
    idempotencyKey: "receipt-frozen-8",
  });
  assert.equal(blocked.status, "reject");
  assert.equal(blocked.rule, "frozen");
  const frozenReceipt = await getReceiptById(blocked.id);
  assert.ok(frozenReceipt);
  assert.equal(frozenReceipt!.rule, "frozen");
});

test("getReceiptById returns null for unknown id", async () => {
  await prepareDemo(demo);
  assert.equal(await getReceiptById("does-not-exist"), null);
});

test("runDemoAgentFlow jailbeat lists ignoredFields for agent trust", async () => {
  const { results } = await runDemoAgentFlow(demo, "jev-freeze");
  const jail = results.find((item) => item.beat.id === "jailbreak") ?? results[3];
  assert.ok(jail);
  assert.ok(jail!.receipt.ignoredFields.includes("approved"));
  assert.ok(jail!.receipt.ignoredFields.includes("policy"));
});

test("getReceiptById returns null for malformed ids", async () => {
  await prepareDemo(demo);
  assert.equal(await getReceiptById("../etc/passwd"), null);
  assert.equal(await getReceiptById("not-a-uuid"), null);
  assert.equal(await getReceiptById("x".repeat(100)), null);
});
