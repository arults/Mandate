import assert from "node:assert/strict";
import test from "node:test";

import { agentBeats } from "./agent-script.ts";
import { resetGateForTests, runDemoAgentFlow, snapshot } from "./gate.server.ts";
import { DEMO_POLICY } from "./policy.ts";
import { hashPurpose, hashRecipient, truncateRecipient } from "./privacy.ts";

test.beforeEach(async () => {
  await resetGateForTests();
});

test("runDemoAgentFlow returns 4 privacy-minimized receipts in one pass", async () => {
  const runId = "testflow1";
  const { gate, receipts, results } = await runDemoAgentFlow(DEMO_POLICY, runId);

  assert.equal(results.length, 4);
  assert.equal(receipts.length, 4);
  assert.equal(agentBeats(runId).length, 4);

  const expectedStatuses = ["allow", "needs_approval", "reject", "reject"] as const;
  for (let i = 0; i < 4; i++) {
    const { beat, receipt } = results[i]!;
    assert.equal(beat.id, agentBeats(runId)[i]!.id);
    assert.equal(receipt.status, expectedStatuses[i]);
    assert.equal(receipt.privacyMode, "minimize");
    assert.equal(receipt.request.purpose, null);
    assert.ok(receipt.request.purposeHash);
    assert.match(receipt.request.purposeHash!, /^[0-9a-f]{64}$/);
    assert.ok(receipt.request.recipientHash);
    // Agent view never leaks full recipient when minimize.
    const rawTo = String(agentBeats(runId)[i]!.body.to);
    assert.equal(receipt.request.to.includes(rawTo) && rawTo.length > 10, false);
    assert.equal(receipt.request.recipientHash, hashRecipient(rawTo));
    assert.equal(receipt.request.purposeHash, hashPurpose(String(agentBeats(runId)[i]!.body.purpose)));
  }

  // allow beat: truncated vendor.near
  assert.equal(results[0]!.receipt.request.to, truncateRecipient("vendor.near"));
  // jailbreak ignored fields
  assert.ok(results[3]!.receipt.ignoredFields.includes("approved"));
  assert.ok(results[3]!.receipt.ignoredFields.includes("policy"));

  assert.ok(gate.policy);
  assert.equal(gate.policy!.privacyMode, "minimize");
  assert.equal(snapshot().pending.length, 1);
  assert.equal(snapshot().pending[0]!.request.amountUsd, 18);
});

test("runDemoAgentFlow accepts a custom policy input", async () => {
  const { results } = await runDemoAgentFlow(
    { ...DEMO_POLICY, maxPerTransactionUsd: 5, approvalThresholdUsd: 4 },
    "custom1",
  );
  // $8 allow becomes reject under max 5
  assert.equal(results[0]!.receipt.status, "reject");
  assert.equal(results[0]!.receipt.privacyMode, "minimize");
  assert.equal(results[0]!.receipt.request.purpose, null);
});
