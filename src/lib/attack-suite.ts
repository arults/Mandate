/**
 * Named adversarial cases. Verdicts are asserted in attack-suite.test.ts.
 * The calm desk plays seven of these; the rest stay in the suite.
 */
export type AttackCase = {
  id: string;
  label: string;
  verdict: string;
};

export const ATTACK_SUITE: readonly AttackCase[] = [
  { id: "jailbreak", label: "jailbreak", verdict: "reject allowed_recipients; approved and policy ignored" },
  { id: "look-alike", label: "look-alike", verdict: "reject allowed_recipients for hote1.near" },
  { id: "over-cap", label: "over cap", verdict: "reject max_per_transaction" },
  { id: "over-day", label: "over day", verdict: "reject daily_limit" },
  { id: "balance", label: "balance", verdict: "reject balance; wallet not debited" },
  { id: "wrong-asset", label: "wrong asset", verdict: "reject allowed_assets" },
  { id: "wrong-chain", label: "wrong chain", verdict: "reject chain" },
  { id: "duplicate", label: "duplicate", verdict: "same receipt id; spend once; submitted false" },
  { id: "freeze", label: "freeze", verdict: "reject frozen" },
  { id: "reject-hold", label: "reject hold", verdict: "cancelled; hold released" },
  { id: "mcp-jailbreak", label: "MCP", verdict: "mandate_pay ignores approved and policy" },
  { id: "privacy", label: "privacy", verdict: "agent receipt hashes purpose and recipient" },
  { id: "no-policy", label: "no policy", verdict: "409 no_policy; no invented policy" },
  { id: "conflict", label: "conflict", verdict: "409 conflict on a reused key with a different body" },
  { id: "submitted-false", label: "submitted false", verdict: "allow keeps submitted false and no tx hash" },
];

/** Quiet line under the live attack chips. Does not replace them. */
export const ATTACK_SUITE_NOTE =
  "Also covered in suite: jailbreak · wrong asset · wrong chain · balance · MCP · privacy · conflict";
