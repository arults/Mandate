# Mandate

A human sets a spending policy once. An AI agent can ask to pay. The policy is enforced **outside the model**, so a prompt injection cannot raise the cap, swap the recipient, or mark a payment approved.

This is a NEAR hackathon prototype (Agent Economy, AI Security & Defense, Autonomous Business). The preview gate is a local stand-in for an OutLayer TEE wallet. It uses the same decision the enclave would make. It does not invent a transaction hash. When `OUTLAYER_API_KEY` is present, an allowed payment also dry-runs `POST /wallet/v1/intents/withdraw` and still does not broadcast.

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
              receipt + NEAR Intents 1-Click path
              (quote + OutLayer withdraw — not broadcast
               unless you wire a live key and choose to)
```

| Piece | Where |
|---|---|
| Policy types and `evaluatePolicy` | `src/lib/policy.ts` |
| Gate (balance, daily spend, approvals, receipts) | `src/lib/gate.server.ts` |
| Console calls | `src/lib/gate.functions.ts` |
| Agent HTTP API | `POST /api/v1/pay` |
| Human HTTP API | `POST /api/v1/policy`, `/api/v1/fund`, `/api/v1/approvals` |
| UI | `src/routes/index.tsx` |

Another agent should call only `POST /api/v1/pay`. See [AGENT.md](AGENT.md).

Demo policy: **$25 max per transaction**, **$50 per day**, **approve above $10**, USDC only, recipients `vendor.near`, `studio.near`, and one EVM address. Destination chains in the demo: Base, Ethereum, Arbitrum, Solana, Polygon, NEAR.

## Setup

```bash
npm install
npm run dev
```

The app listens on port 8080. No `.env` file. Optional, server-only:

| Variable | Effect |
|---|---|
| `OUTLAYER_API_KEY` | Allowed payments also dry-run OutLayer withdraw. Still no broadcast. |

Production keys live in OutLayer (`https://api.outlayer.ai`, skill at `https://skills.outlayer.ai/agent-custody/SKILL.md`). NEAR Intents quotes: `https://1click.chaindefuser.com/v0/quote`. Intents are mainnet-only.

## Demo steps

Do these in the console. The agent posts to `POST /api/v1/pay`. You do not type the four bodies.

1. **Run the agent.** It publishes the demo mandate first. Remaining today is **$50.00**. Balance is **$200.00**. Running it again resets today's spend and pending approvals. It does not erase the ledger.
2. **$8 to vendor.near on Base** → **Allowed**. Attestation says **local policy gate**, not a TEE, unless an OutLayer dry-run returned `would_succeed: true`. `settlement.submitted` is **false**. Remaining becomes **$42.00**. No transaction hash.
3. **$18 to studio.near** → **Needs approval**. Remaining drops because the amount is held. Balance stays **$200.00** until you approve. **Approve** spends it. **Reject** releases the hold.
4. **$40** → **Blocked · max_per_transaction**. Remaining does not change.
5. **Jailbreak** → body includes `approved: true` and a fake policy. The receipt lists those as **ignored**. Status is **Blocked · allowed_recipients**.

The mandate in this preview is **process memory**. A restart forgets the policy, the balance, and the ledger. Do not describe it as durable. Production stores the policy in OutLayer, encrypted on NEAR. The pay route stays the same.

Save policy and Add funds are human actions. `POST /api/v1/policy`, `/api/v1/fund`, and `/api/v1/approvals` are closed unless the server has `MANDATE_HUMAN_TOKEN`.

## Demo post

The submission needs a public post on X that says it was built at NEAR HACKATHON, plus the public repo. Paste this only after you have a screen recording of Run the agent. Do not claim a customer, a broadcast, or a TEE attestation you do not have.

```text
Built at NEAR HACKATHON.

Mandate: the agent can ask. It cannot sign.

A human sets a $25 cap, a $50 day, and an allow-list. The agent calls POST /api/v1/pay.
$8 to vendor.near is allowed and not broadcast.
$18 waits. The balance does not move until a human approves.
$40 dies on the cap.
A jailbreak that sends approved: true still dies.

This preview keeps the mandate in process memory. It is not a TEE attestation unless an OutLayer dry-run returns would_succeed. No invented transaction hash.

https://github.com/arults/Mandate
```

A payment that needs approval reserves today's limit (and the available balance) so later requests cannot oversubscribe the day. At most 20 payments can wait. A UTC date change cancels anything still waiting and releases the hold. Prepare demo clears pending approvals and idempotency keys. It does not erase the ledger.

## What this prototype does not do

- It does not give the agent a private key.
- It does not treat the model, or a field named `approved`, as authorization.
- It does not broadcast a mainnet transaction or invent a solver fill.
- It does not ship a marketplace, a second agent, KYC, or a fiat ramp.

The in-memory gate matches one running server. A deployed multi-instance host should store the policy in OutLayer, encrypted on NEAR, and let the enclave evaluate it. The HTTP shapes in AGENT.md stay the same.

Part of FORGE (arults).

## Site

`/` is the short explanation. `/docs` is the same rules for a person. `/llms.txt` is the agent contract. `/console` is the human gate.

## Log book

Audits and evals are appended to [LOGBOOK.txt](LOGBOOK.txt). Earlier entries stay. Do not rewrite them.
