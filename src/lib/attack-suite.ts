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
  { id: "jailbreak", label: "fake yes", verdict: "reject allowed_recipients; approved and policy ignored" },
  { id: "look-alike", label: "look-alike", verdict: "reject allowed_recipients for hote1.near" },
  { id: "over-cap", label: "over limit", verdict: "reject max_per_transaction" },
  { id: "over-day", label: "over today", verdict: "reject daily_limit" },
  { id: "balance", label: "not enough", verdict: "reject balance; wallet not debited" },
  { id: "wrong-asset", label: "wrong money", verdict: "reject allowed_assets" },
  { id: "wrong-chain", label: "wrong place", verdict: "reject chain" },
  { id: "duplicate", label: "same request", verdict: "same receipt id; spend once; submitted false" },
  { id: "freeze", label: "freeze", verdict: "reject frozen" },
  { id: "reject-hold", label: "say no", verdict: "cancelled; hold released" },
  { id: "mcp-jailbreak", label: "same check", verdict: "mandate_pay ignores approved and policy" },
  { id: "privacy", label: "hidden note", verdict: "agent receipt hashes purpose and recipient" },
  { id: "no-policy", label: "no rules yet", verdict: "409 no_policy; no invented policy" },
  { id: "conflict", label: "changed request", verdict: "409 conflict on a reused key with a different body" },
  { id: "submitted-false", label: "not sent", verdict: "allow keeps submitted false and no tx hash" },
];

/** Quiet line under the live legend. Does not replace it. */
export const ATTACK_SUITE_NOTE =
  "Also checked, not all shown here: fake yes · wrong money · wrong place · not enough · hidden note · changed request";
