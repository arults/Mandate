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
| `reject` | Blocked. `receipt.rule` is the reason (`allowed_recipients`, `max_per_transaction`, `daily_limit`, `balance`, `frozen`, `allowed_assets`, `chain`). |
| `cancelled` | A human rejected an approval. |

`409` with `error: "no_policy"` means the human has not saved a policy. Do not invent one. `400` means the body itself is invalid.

The human console owns:

- `POST /api/v1/policy` — caps, allow-list, approval threshold, freeze
- `POST /api/v1/fund` — demo balance
- `POST /api/v1/approvals` — `{ "id", "action": "approve" | "reject" }`
- `GET /api/v1/policy` — remaining daily limit, balance, pending approvals, ledger

An agent that calls those is acting as the owner, not as the payer. In production, replace this process with OutLayer Agent Custody: the human publishes the policy into the TEE, and the agent keeps only a `wk_` API key. Same rule: the key can request a signature, it cannot rewrite the policy.

Idempotency: send `idempotencyKey`. A repeat returns the original receipt.

Typed judgment, if you want one, is advisory:

```ts
type Judgment = {
  riskScore: number;
  policyCompliance: "compliant" | "over_cap" | "recipient_blocked" | "needs_approval" | "unknown";
  proposed: { to: string; amount: string; asset: string; chain: string };
};
```

Discard `policyCompliance`. The gate recomputes it.
