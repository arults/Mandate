# Connect an agent to Mandate

The model may propose a payment. It must not sign, and it must not override the policy check.

Call **only** this endpoint:

`POST /api/v1/pay`

```json
{
  "amountUsd": 8,
  "asset": "USDC",
  "to": "vendor.near",
  "chain": "base",
  "purpose": "API invoice 14"
}
```

`chain` is one of `base`, `ethereum`, `arbitrum`, `solana`, `polygon`, `near`. Amounts are USD with at most 2 decimal places. USDC is the only allowed asset in this demo (6 decimals on the wire: $8 → `8000000` units).

Do not send `approved`, `policy`, `signature`, or a private key. Those fields are ignored. A 200 response is still a decision, not a success by itself. Read `receipt.status`:

| status | Meaning |
|---|---|
| `allow` | Inside the policy. `settlement.submitted` is `false` unless a later live integration broadcasts. |
| `needs_approval` | Over the human threshold, still inside the caps. Wait. Do not retry with a higher amount. |
| `reject` | Blocked. `receipt.rule` is the reason (`allowed_recipients`, `max_per_transaction`, `daily_limit`, `balance`, `frozen`, `allowed_assets`, `chain`, `pending_full`, `settlement_refused`, `settlement_unconfirmed`, `day_rolled`). |
| `cancelled` | A human rejected an approval, or the UTC day changed while it was waiting. |

`409` with `error: "no_policy"` means the human has not saved a policy. Do not invent one. `409` with `error: "conflict"` means this `idempotencyKey` was already used for a different payment. `400` means the body itself is invalid.

The human console owns policy, funding, and approvals. Console `createServerFn` human controls (`savePolicy`, `prepareDemoGate`, `addFunds`, `decideApproval`, `getGate`) require a same-origin browser (`Sec-Fetch-Site: same-origin`) or a matching `x-mandate-human` token — agents cannot call them like `/api/v1/pay`. The HTTP routes for those (`/api/v1/policy`, `/api/v1/fund`, `/api/v1/approvals`) return **403** unless the operator set `MANDATE_HUMAN_TOKEN` on the server, and **401** if the `x-mandate-human` header does not match. Calling them from the agent is not a payment. In production, replace this process with OutLayer Agent Custody: the human publishes the policy into the TEE, and the agent keeps only a `wk_` API key. Same rule: the key can request a signature, it cannot rewrite the policy.

Idempotency: send `idempotencyKey` (string, max 80 characters). A repeat of the same payment returns the original receipt and does not spend again, even after that row scrolls off the visible ledger. A repeat with a different amount, recipient, chain, or purpose is a conflict. Prepare demo clears stored keys. If the settlement check cannot be reached, or OutLayer answers 429 or 5xx, the result is `settlement_unconfirmed` and the same key can be retried. A dry-run body with `would_succeed: false`, or any other 4xx, is `settlement_refused` and is stored. On a payment that did not need approval, `settlement_unconfirmed` is not stored. If that happens while a human is approving, the hold stays and the key still returns `needs_approval`. `.near` recipients are matched case-insensitively. Recipients must be plain ASCII with no spaces: a NEAR account, a 20-byte hex address, or a base58 address. Amounts may be a JSON number or a decimal string, at least 0.01, at most 2 places, and at most 1000000.

While a payment waits for approval it holds today's remaining limit. Privacy: when the human policy uses `privacyMode: "minimize"` (default), your `POST /api/v1/pay` receipt omits raw `purpose` (you get `purposeHash` instead) and truncates `to` / settlement recipient (plus `recipientHash`). Amounts, status, and rules stay visible. You cannot force full disclosure with a body flag. This is not a TEE attestation.

Do not stack more requests than the day can cover. A hold is not a payment: `settlement.submitted` is still false, and the balance does not move until a human approves.

Typed judgment, if you want one, is advisory:

```ts
type Judgment = {
  riskScore: number;
  policyCompliance: "compliant" | "over_cap" | "recipient_blocked" | "needs_approval" | "unknown";
  proposed: { to: string; amount: string; asset: string; chain: string };
};
```

Discard `policyCompliance`. The gate recomputes it.

## Read a receipt later

`GET /api/v1/receipt?id=<receiptId>`

Use the `receipt.id` from a prior `POST /api/v1/pay`. Returns the same agent-minimized receipt shape. `404` if this gate instance no longer has it (Reset demo, cold isolate without shared DB). This is **not** a TEE attestation and **not** proof of broadcast — read `settlement.submitted` (stays `false` in preview).

## Human controls you cannot call

Freeze / Unfreeze and Reset demo live on the human console. When frozen, your next `POST /api/v1/pay` returns `reject` with `rule: "frozen"`. You cannot unfreeze via `/pay`. After Reset demo the ledger is empty and `DEMO_POLICY` is republished — get a fresh allow before relying on an old receipt id.

