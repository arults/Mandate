# Connect an agent to Mandate

The model may propose a payment. It must not sign, and it must not override the policy check.

The **Mandate gate** decides allow / needs_approval / reject on the wire. Do not send `approved` / `policy` / keys — those fields are ignored. Do not claim a TEE.

## Screen the five-ask desk (public preview)

Open https://mandate-git-cursor-travel-desk-ux-512a-eden-0d67.vercel.app/console

That is the Vercel Preview for branch `cursor/travel-desk-ux-512a`. Do not screen https://mandate-ashy.vercel.app/console for this branch. That host is `main` and does not have this desk.

1. Read the caps before you click: **$300.00** per payment, **$800.00** today, **Ask you above $150.00**. **Allow-list** chips `hotel.near`, `airline.near`, `rides.near` are that policy. A look-alike is spelling against the list, not a scam registry. Preview float **$2,000.00**. Not a wallet.
2. Click **Run travel agent**. Leave **Advanced** closed.
3. Under **Allow, hold, or block**, see:
   - Hotel **$80.00** → **Allowed**. **NEAR Intents · dry quote**: `submitted` **false**, path `near → base`, click or copy the dry quote id when the server returned one (otherwise the line says **dry quote not attached**), `tx hash` **none**.
   - Airline **$250.00** → **On hold**. Approve or Reject on that row. Balance does not move until Approve.
   - Hotel **$500.00** → **Blocked · over the cap**.
   - Look-alike **$80.00** to `hote1.near` → Who you pay beside Allow-list `hotel.near` (**digit 1** vs **letter l**), **Look-alike · not on allow-list**, then **Blocked · not on the list**. Not among the allow-list above. Allow-list and look-alike spelling, not a scam registry. **Fake approval ignored · approved**.
   - Burst of **$120.00** rides to `rides.near` → three legs **Allowed**, the fourth **Blocked · over the day**. The burst row chip is **Blocked · over the day**. An allowed ride shows the same receipt: `submitted` **false**, `tx hash` **none**.
4. **NEAR composition**: **Live today** is the off-chain gate plus a NEAR Intents 1-Click dry quote (`submitted false`, no transaction hash). The decision is not a broadcast. **Next** is a Function Call Key that can limit an agent key to a receiver, methods, and allowance. It cannot express USD caps, the allow-list, or a human hold. Not live on this desk. Not a vault.
5. Chips **Allow $80**, **Hold $250**, **Cap $500**, **Look-alike**, and **Burst** replay one ask. A cold server that forgot the rules: click again.

`POST /api/v1/pay` from another machine to that host often returns `409` `no_policy`. The button above is one server call on one isolate, so it is the public repro. For curl, use local `npm run dev` after Run (commands in [README.md](README.md)).

## Local judge path

```bash
npm install
npm run dev
```

Open http://127.0.0.1:8080/console. Leave **Advanced** closed. **Run travel agent**. Same five asks, Allow-list, and dry-quote honesty as the preview (`submitted` false, `tx hash` none, or dry quote not attached). `npm run judge` prints this path and does not start the server. After that Run, `POST http://127.0.0.1:8080/api/v1/pay` and `POST http://127.0.0.1:8080/api/mcp` hit the same process. Before a policy exists they return `no_policy` (409). `npm test` asserts `src/lib/attack-suite.test.ts` and `src/lib/intents-fidelity.test.ts`.

## MCP (same gate)

MCP is another face on this gate. It is not a second policy and not custody.

Local: `npm run dev`, then `POST http://127.0.0.1:8080/api/mcp`.
Preview: `POST https://mandate-git-cursor-travel-desk-ux-512a-eden-0d67.vercel.app/api/mcp`.
`GET /api/mcp` lists the tool names. JSON-RPC 2.0, protocol `2024-11-05`. Methods: `initialize`, `tools/list`, `tools/call`, `ping`.

| Tool | Arguments | Same wire |
|---|---|---|
| `mandate_pay` | `amountUsd`, `asset`, `to`, `chain`, `purpose`, optional `idempotencyKey` | `POST /api/v1/pay` |
| `mandate_receipt` | `id` (the `receipt.id` from `mandate_pay`) | `GET /api/v1/receipt?id=` |

Outcomes are the receipt `status`: `allow`, `needs_approval`, `reject`, `cancelled`. Read `settlement.submitted` — it stays `false`. There is no transaction hash. A missing policy is a tool error `no_policy` with `httpStatus` 409. Do not invent a policy. `conflict` is 409. A bad body is 400.

`mandate_policy`, fund, and approvals are not tools. `/api/v1/policy`, `/api/v1/fund`, and `/api/v1/approvals` stay human routes.

```bash
curl -s http://127.0.0.1:8080/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"mandate_pay","arguments":{"amountUsd":8,"asset":"USDC","to":"vendor.near","chain":"base","purpose":"API invoice 14"}}}'
```

On a cold isolate that curl returns `no_policy` until the human has published a policy on that same process. The console button is still the public repro.

Call **only** this HTTP endpoint, or the two MCP tools above:

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

`409` with `error: "no_policy"` means the human has not saved a policy. Do not invent one. On the public Vercel host this is also the honest cross-isolate answer (browser Run and your curl often hit different ephemeral PGLite instances). Prefer console for demos; curl against local `npm run dev` after Reset/Run. `409` with `error: "conflict"` means this `idempotencyKey` was already used for a different payment. `400` means the body itself is invalid.

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

Freeze / Unfreeze and Reset demo live on the human console. When frozen, your next `POST /api/v1/pay` returns `reject` with `rule: "frozen"`. That is a gate kill switch on this desk, not a chain pause. You cannot unfreeze via `/pay`. After Reset demo the ledger is empty and `DEMO_POLICY` is republished — get a fresh allow before relying on an old receipt id.
