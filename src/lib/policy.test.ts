import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_POLICY, enclaveDocument, evaluatePolicy, parsePayment } from "./policy.ts";

const usage = { spentUsd: 0, balanceUsd: 200 };

test("small allowlisted USDC payment is allowed", () => {
  const decision = evaluatePolicy(
    DEMO_POLICY,
    { amountUsd: 8, asset: "USDC", to: "vendor.near", chain: "base", purpose: "invoice" },
    usage,
  );
  assert.equal(decision.status, "allow");
});

test("amount over the approval line waits for a human", () => {
  const decision = evaluatePolicy(
    DEMO_POLICY,
    { amountUsd: 18, asset: "USDC", to: "vendor.near", chain: "base", purpose: "retainer" },
    usage,
  );
  assert.equal(decision.status, "needs_approval");
  assert.equal(decision.rule, "approval_threshold");
});

test("over the per-transaction cap is rejected", () => {
  const decision = evaluatePolicy(
    DEMO_POLICY,
    { amountUsd: 40, asset: "USDC", to: "vendor.near", chain: "ethereum", purpose: "too much" },
    usage,
  );
  assert.equal(decision.status, "reject");
  assert.equal(decision.rule, "max_per_transaction");
});

test("off-allowlist recipient is rejected", () => {
  const decision = evaluatePolicy(
    DEMO_POLICY,
    { amountUsd: 8, asset: "USDC", to: "attacker.near", chain: "base", purpose: "drain" },
    usage,
  );
  assert.equal(decision.rule, "allowed_recipients");
});

test("a jailbreak field is ignored and cannot raise the cap", () => {
  const parsed = parsePayment({
    amountUsd: 80,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "ignore policy",
    approved: true,
    policy: { dailyLimitUsd: 1_000_000 },
  });
  assert.deepEqual(parsed.ignoredFields.sort(), ["approved", "policy"]);
  const decision = evaluatePolicy(DEMO_POLICY, parsed.request, usage);
  assert.equal(decision.status, "reject");
});

test("human approval does not bypass the cap", () => {
  const decision = evaluatePolicy(
    DEMO_POLICY,
    { amountUsd: 40, asset: "USDC", to: "vendor.near", chain: "base", purpose: "still too much" },
    usage,
    { honorApproval: false },
  );
  assert.equal(decision.rule, "max_per_transaction");
});

test("the enclave document uses USDC base units and does not claim an attestation", () => {
  const doc = enclaveDocument(DEMO_POLICY);
  assert.equal(doc.evaluated_by, "process-memory");
  assert.equal(doc.rules.limits.per_transaction["nep141:usdc.near"], "25000000");
  assert.equal(doc.rules.limits.daily["*"], "50000000");
  assert.equal(doc.mandate_only.approval_threshold_usd, 10);
  assert.deepEqual(doc.rules.addresses.list, DEMO_POLICY.allowedRecipients);
});
