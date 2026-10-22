import assert from "node:assert/strict";
import test from "node:test";

import {
  fundWallet,
  prepareDemo,
  publishPolicy,
  resetGateForTests,
  snapshot,
  submitPayment,
} from "./gate.server.ts";
import { parsePayment, parsePolicy, DEMO_POLICY } from "./policy.ts";
import {
  hashPurpose,
  hashRecipient,
  projectReceipt,
  truncateRecipient,
} from "./privacy.ts";

const demo = {
  maxPerTransactionUsd: 25,
  dailyLimitUsd: 50,
  allowedRecipients: ["vendor.near", "studio.near", "0x1111111111111111111111111111111111111111"],
  approvalThresholdUsd: 10,
  allowedAssets: ["USDC"] as ["USDC"],
  frozen: false,
  privacyMode: "minimize" as const,
};

function pay(overrides: Record<string, unknown> = {}) {
  return {
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "API invoice 14",
    ...overrides,
  };
}

test.beforeEach(async () => {
  await resetGateForTests();
  await prepareDemo(demo);
});

test("purpose hashing is stable for normalized purpose", () => {
  const a = hashPurpose("  API invoice 14  ");
  const b = hashPurpose("API invoice 14");
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("recipient hashing and truncate shapes", () => {
  assert.equal(hashRecipient("Vendor.near"), hashRecipient("vendor.near"));
  const near = truncateRecipient("vendor.near");
  assert.match(near, /^vendor\.\.\.[0-9a-f]{8}\.near$/);
  assert.equal(near.includes("vendor.near"), false);
  const evm = truncateRecipient("0x1111111111111111111111111111111111111111");
  assert.equal(evm, "0x1111...1111");
});

test("minimize strips purpose and full recipient for agent view", async () => {
  const full = await submitPayment(pay());
  assert.equal(full.request.purpose, "API invoice 14");
  assert.equal(full.request.to, "vendor.near");
  const agent = projectReceipt(full, snapshot().policy, "agent");
  assert.equal(agent.privacyMode, "minimize");
  assert.equal(agent.request.purpose, null);
  assert.ok(agent.request.purposeHash);
  assert.equal(agent.request.purposeHash, hashPurpose("API invoice 14"));
  assert.equal(agent.request.to, truncateRecipient("vendor.near"));
  assert.equal(agent.request.recipientHash, hashRecipient("vendor.near"));
  assert.equal(agent.detail.includes("vendor.near"), false);
  assert.equal(agent.attestation.statement.includes("vendor.near"), false);
  if (agent.settlement) {
    assert.equal(agent.settlement.recipient, truncateRecipient("vendor.near"));
  }
});

test("human view keeps full purpose and recipient", async () => {
  const full = await submitPayment(pay());
  const human = projectReceipt(full, snapshot().policy, "human");
  assert.equal(human.request.purpose, "API invoice 14");
  assert.equal(human.request.to, "vendor.near");
  assert.ok(human.request.purposeHash);
  assert.ok(human.request.recipientHash);
});

test("full privacyMode leaves agent view unredacted", async () => {
  await publishPolicy({ ...demo, privacyMode: "full" });
  await fundWallet(200, "set");
  const full = await submitPayment(pay({ purpose: "secret memo" }));
  const agent = projectReceipt(full, snapshot().policy, "agent");
  assert.equal(agent.privacyMode, "full");
  assert.equal(agent.request.purpose, "secret memo");
  assert.equal(agent.request.to, "vendor.near");
});

test("privacyMode in agent body is ignored and cannot force full disclosure", async () => {
  const parsed = parsePayment(
    pay({
      privacyMode: "full",
      approved: true,
      purpose: "keep private",
    }),
  );
  assert.ok(parsed.ignoredFields.includes("privacyMode"));
  assert.ok(parsed.ignoredFields.includes("approved"));
  const full = await submitPayment(
    pay({ privacyMode: "full", approved: true, purpose: "keep private" }),
  );
  const agent = projectReceipt(full, snapshot().policy, "agent");
  assert.equal(agent.privacyMode, "minimize");
  assert.equal(agent.request.purpose, null);
  assert.equal(agent.request.to.includes("vendor.near"), false);
});

test("parsePolicy defaults privacyMode to minimize", () => {
  const policy = parsePolicy({
    maxPerTransactionUsd: 25,
    dailyLimitUsd: 50,
    allowedRecipients: ["vendor.near"],
    approvalThresholdUsd: 10,
  });
  assert.equal(policy.privacyMode, "minimize");
  assert.equal(DEMO_POLICY.privacyMode, "minimize");
  const full = parsePolicy({
    maxPerTransactionUsd: 25,
    dailyLimitUsd: 50,
    allowedRecipients: ["vendor.near"],
    approvalThresholdUsd: 10,
    privacyMode: "full",
  });
  assert.equal(full.privacyMode, "full");
});
