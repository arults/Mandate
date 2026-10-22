# Mandate

A human sets a spending policy once. An AI agent can ask to pay. The policy is enforced **outside the model**, so a prompt injection cannot raise the cap, swap the recipient, or mark a payment approved.

This is a NEAR hackathon prototype (tracks: **security**, **agents**, **business**). The preview gate is a local stand-in for an OutLayer TEE wallet. It uses the same decision the enclave would make. It does not invent a transaction hash. When `OUTLAYER_API_KEY` is present, an allowed payment also dry-runs `POST /wallet/v1/intents/withdraw` and still does not broadcast.

**Live (clone-free):** [mandate-ashy.vercel.app](https://mandate-ashy.vercel.app) · console [ /console ](https://mandate-ashy.vercel.app/console) · litepaper [ /docs ](https://mandate-ashy.vercel.app/docs)

## Problem

Agents that hold a raw key can be talked out of it. A system prompt is not a lock. Mandate keeps the key (in production, inside OutLayer's Intel TDX enclave) away from the agent. The agent submits `pay X of Y to Z`. Something that is not the LLM answers allow, block, or needs-approval.

## Architecture

```text
Human console                Agent request
save policy / fund    →      { amountUsd, asset, to, chain, purpose }
        │                              │
        └──────────► policy gate ◄─────┘
                     (not the LLM)
                          │
          allow | reject | needs_approval
                          │
              receipt + NEAR Intents 1-Click dry quote
              (settlement.submitted stays false;
               OutLayer withdraw dry-run optional)
```

| Piece | Where |
|---|---|
| Policy types and `evaluatePolicy` | `src/lib/policy.ts` |
| Gate (balance, daily spend, approvals, receipts) | `src/lib/gate.server.ts` |
| Durable store (PGLite / local-db) | `src/lib/gate-persist.server.ts` |
| 1-Click dry quote (read-only) | `src/lib/oneclick-quote.server.ts` |
| Console calls | `src/lib/gate.functions.ts` |
| Agent HTTP API | `POST /api/v1/pay` |
| Human HTTP API | `POST /api/v1/policy`, `/api/v1/fund`, `/api/v1/approvals` |

Another agent should call only `POST /api/v1/pay`. See [AGENT.md](AGENT.md).

Demo policy: **$25 max per transaction**, **$50 per day**, **approve above $10**, USDC only, recipients `vendor.near`, `studio.near`, and one EVM address. Destination chains in the demo: Base, Ethereum, Arbitrum, Solana, Polygon, NEAR.

## Judge path (do X → see Y)

No clone required:

1. Open https://mandate-ashy.vercel.app/console
2. Click **Run the agent**
3. Read four receipts: allow $8 · needs approval $18 · block $40 · jailbreak ignored
4. **Approve** the $18 hold
5. Confirm `settlement.submitted` is `false` and attestation is not a TEE unless an OutLayer dry-run returned `would_succeed: true`
6. Optional: **Freeze wallet now** → next ask dies with `rule: frozen`. **Reset demo** wipes ledger so curl can re-run.
7. Copy `receipt.id` → `GET /api/v1/receipt?id=…` for a shareable agent-minimized decision (still not a TEE / not broadcast).

Exact agent curl against the live host (after Run the agent, or after you publish a policy locally):

```bash
curl -sS -X POST 'https://mandate-ashy.vercel.app/api/v1/pay' \
  -H 'content-type: application/json' \
  -d '{
    "amountUsd": 8,
    "asset": "USDC",
    "to": "vendor.near",
    "chain": "base",
    "purpose": "judge demo",
    "idempotencyKey": "judge-8"
  }"
```

Expect JSON with `status: "allow"` or `"reject"` / `"needs_approval"`. Jailbreak fields `approved` / `policy` are ignored if present.

## Setup

```bash
npm install
npm run dev
```

The app listens on port 8080. No `.env` file required. Optional, server-only:

| Variable | Effect |
|---|---|
| `OUTLAYER_API_KEY` | Allowed payments also dry-run OutLayer withdraw. Still no broadcast. |
| `MANDATE_HUMAN_TOKEN` | Opens HTTP `/policy` `/fund` `/approvals` when `x-mandate-human` matches. |
| `MANDATE_DURABILITY` | `local-db` (default) persists policy+ledger via embedded PGLite. `process-memory` disables disk/db persistence. |
| `MANDATE_PGDATA` | Optional PGLite data directory (default `.data/mandate-gate` locally, `/tmp/mandate-gate` on Vercel). |
| `MANDATE_1CLICK_QUOTE` | `1` (default) = dry-quote on allow. `0` skips the network call. |

Production keys live in OutLayer (`https://api.outlayer.ai`, skill at `https://skills.outlayer.ai/agent-custody/SKILL.md`). NEAR Intents quotes: `https://1click.chaindefuser.com/v0/quote` (dry, read-only in this preview). Intents are mainnet-only.

## Durability (honest)

Default **`durability: "local-db"`**: policy, balance, pending holds, ledger, and idempotency keys are written through an embedded **PGLite** store so a process-memory clear / local restart can reload them. This is **not** a TEE attestation and **not** multi-instance shared storage. On serverless without a shared Postgres (`DATABASE_URL` / Neon), cold starts can still lose `/tmp` data — production stores the mandate in OutLayer, encrypted on NEAR. Set `MANDATE_DURABILITY=process-memory` for the old in-memory-only behavior.

## Privacy (agent receipts)

Default **`privacyMode: "minimize"`** on new policies (toggle on the console).

| Viewer | What they see |
|---|---|
| Agent `POST /api/v1/pay` | No free-text `purpose` (null + `purposeHash` sha256). Recipient truncated + `recipientHash`. Amounts, status, rules, idempotency stay visible. |
| Human console / `MANDATE_HUMAN_TOKEN` routes | Full purpose and full recipient. Hashes optional extras. |

This is **receipt minimization**, not a TEE and not encryption-at-rest for the local-db. `settlement.submitted` stays `false` in this preview. An agent body field `privacyMode` is ignored — only the human policy controls disclosure.

## Security track: Function Call Keys (composition)

NEAR **Function Call Keys (FCK)** can limit a key to a receiver contract + methods + allowance. They cannot express USD daily caps, human approval thresholds, or allow-lists the way Mandate does.

**Composition (docs now; thin wiring later):**

1. Human account keeps FullAccess offline (or in OutLayer).
2. Agent never receives FullAccess.
3. Agent holds only: (a) a Mandate/`wk_` request credential to call `POST /api/v1/pay` / OutLayer ask, and/or (b) an FCK scoped to the Mandate gate contract or OutLayer withdraw methods — not `transfer` of arbitrary tokens.
4. Sub-account pattern: `agent.<treasury>.near` with an FCK; treasury FullAccess stays with the human / enclave.

**Roadmap (named, not shipped):** on-chain FCK issuance helpers + OutLayer **TEE attestation** verify page. This repo does **not** invent attestation bytes or claim enclave measurement.

## Demo steps (console)

1. **Run the agent.** Publishes the demo mandate. Remaining today **$50.00**. Balance **$200.00**.
2. **$8 to vendor.near on Base** → **Allowed**. Optional live 1-Click dry quote id/amount on the receipt. `settlement.submitted` is **false**.
3. **$18 to studio.near** → **Needs approval**. Approve spends; Reject releases.
4. **$40** → **Blocked · max_per_transaction**.
5. **Jailbreak** → `approved: true` + fake policy → listed as **ignored** → **Blocked · allowed_recipients**.

## Demo post (X)

Paste only after you have a screen recording. Do not claim a customer, a broadcast, or a TEE attestation you do not have.

```text
Built at NEAR HACKATHON.

Mandate: the agent can ask. It cannot sign.

A human sets a $25 cap, a $50 day, and an allow-list. The agent calls POST /api/v1/pay.
$8 to vendor.near is allowed and not broadcast.
$18 waits. The balance does not move until a human approves.
$40 dies on the cap.
A jailbreak that sends approved: true still dies.

Preview durability is local-db (PGLite), not a TEE. No invented transaction hash.

https://mandate-ashy.vercel.app
https://github.com/arults/Mandate
```

## What this prototype does not do

- It does not give the agent a private key or FullAccess.
- It does not treat the model, or a field named `approved`, as authorization.
- It does not broadcast a mainnet transaction or invent a solver fill.
- It does not ship TEE attestation bytes, a marketplace, a second agent, KYC, or a fiat ramp.

Part of FORGE (arults).

## Site

`/` short explanation · `/docs` litepaper · `/llms.txt` agent contract · `/console` human gate.

## Log book

Audits and evals are appended to [LOGBOOK.txt](LOGBOOK.txt). Earlier entries stay. Do not rewrite them.
