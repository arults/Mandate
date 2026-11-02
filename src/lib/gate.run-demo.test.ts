import assert from "node:assert/strict";
import test from "node:test";

import { agentBeats, travelAgentBeats } from "./agent-script.ts";
import { resetGateForTests, runDemoAgentFlow, snapshot } from "./gate.server.ts";
import { DEMO_POLICY, TRAVEL_DEMO_BALANCE_USD, TRAVEL_POLICY } from "./policy.ts";
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

test("travel beats allow, hold, cap-block, and block a poisoned payee", async () => {
  const runId = "travelops1";
  const beats = travelAgentBeats(runId);
  const { gate, receipts, results } = await runDemoAgentFlow(TRAVEL_POLICY, runId, "travel");

  assert.equal(results.length, 4);
  assert.equal(receipts.length, 4);
  assert.equal(beats.length, 4);
  assert.deepEqual(
    beats.map((beat) => beat.id),
    ["allow", "hold", "block", "poison"],
  );

  const expectedStatuses = ["allow", "needs_approval", "reject", "reject"] as const;
  const expectedRules = [null, "approval_threshold", "max_per_transaction", "allowed_recipients"] as const;
  for (let i = 0; i < 4; i++) {
    const { beat, receipt } = results[i]!;
    assert.equal(beat.id, beats[i]!.id);
    assert.equal(receipt.status, expectedStatuses[i]);
    assert.equal(receipt.rule, expectedRules[i]);
    assert.equal(receipt.privacyMode, "minimize");
    assert.equal(receipt.request.purpose, null);
    assert.equal(receipt.request.purposeHash, hashPurpose(String(beats[i]!.body.purpose)));
    assert.equal(receipt.request.recipientHash, hashRecipient(String(beats[i]!.body.to)));
    const rawTo = String(beats[i]!.body.to);
    assert.equal(receipt.request.to.includes(rawTo) && rawTo.length > 10, false);
  }

  assert.equal(results[0]!.receipt.request.to, truncateRecipient("hotel.near"));
  assert.equal(results[0]!.receipt.settlement?.submitted, false);
  assert.equal(results[1]!.receipt.request.amountUsd, 250);
  assert.equal(results[2]!.receipt.rule, "max_per_transaction");
  assert.equal(results[3]!.beat.id, "poison");
  assert.ok(results[3]!.receipt.ignoredFields.includes("approved"));
  assert.equal(results[3]!.receipt.rule, "allowed_recipients");

  const poison = gate.ledger.find((item) => item.rule === "allowed_recipients");
  assert.ok(poison);
  assert.equal(poison!.request.to, "attacker.near");
  assert.match(poison!.request.purpose, /account moved/i);
  assert.ok(poison!.ignoredFields.includes("approved"));

  assert.ok(gate.policy);
  assert.equal(gate.policy!.maxPerTransactionUsd, 300);
  assert.equal(gate.policy!.dailyLimitUsd, 800);
  assert.equal(gate.policy!.approvalThresholdUsd, 150);
  assert.equal(gate.policy!.privacyMode, "minimize");
  assert.deepEqual(gate.policy!.allowedRecipients, ["hotel.near", "airline.near", "rides.near"]);
  assert.equal(gate.balanceUsd, TRAVEL_DEMO_BALANCE_USD - 80);
  assert.equal(gate.remainingDailyUsd, 800 - 80 - 250);
  assert.equal(snapshot().pending.length, 1);
  assert.equal(snapshot().pending[0]!.request.amountUsd, 250);
  assert.equal(snapshot().pending[0]!.request.to, "airline.near");
});

test("travel poison-only ask blocks the swapped payee and does not spend", async () => {
  const { results, gate } = await runDemoAgentFlow(TRAVEL_POLICY, "poisononly", "travel", "poison");
  assert.equal(results.length, 1);
  assert.equal(results[0]!.beat.id, "poison");
  assert.equal(results[0]!.receipt.status, "reject");
  assert.equal(results[0]!.receipt.rule, "allowed_recipients");
  assert.ok(results[0]!.receipt.ignoredFields.includes("approved"));
  assert.equal(results[0]!.receipt.settlement, null);
  assert.equal(gate.ledger.length, 1);
  assert.equal(gate.ledger[0]!.request.to, "attacker.near");
  assert.match(gate.ledger[0]!.request.purpose, /account moved/i);
  assert.equal(gate.balanceUsd, TRAVEL_DEMO_BALANCE_USD);
  assert.equal(snapshot().pending.length, 0);
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
