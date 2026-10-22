import { Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const sections = [
  { id: "abstract", label: "1. Abstract" },
  { id: "problem", label: "2. Problem" },
  { id: "thesis", label: "3. Thesis" },
  { id: "threat", label: "4. Threat model" },
  { id: "architecture", label: "5. Architecture" },
  { id: "policy", label: "6. Policy object" },
  { id: "agents", label: "7. Agent interface" },
  { id: "humans", label: "8. Human interface" },
  { id: "settlement", label: "9. Settlement & NEAR" },
  { id: "safety", label: "10. Safety properties" },
  { id: "limits", label: "11. Preview limits" },
  { id: "line", label: "12. Product line" },
  { id: "demo", label: "13. Demo protocol" },
  { id: "roadmap", label: "14. Roadmap" },
  { id: "refs", label: "15. References" },
];

export function Docs() {
  return (
    <>
      <SiteNav current="docs" />
      <div className="litepaper mx-auto grid w-full max-w-6xl gap-12 px-5 py-12 sm:py-16 lg:grid-cols-[14rem_minmax(0,42rem)]">
        <nav
          className="hidden text-sm lg:sticky lg:top-24 lg:block lg:self-start print:hidden"
          aria-label="Litepaper"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">Litepaper v0.1</p>
          <ul className="mt-5 space-y-2.5 border-l border-border pl-4">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted transition-colors hover:text-fg">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-muted">
            <a href="/llms.txt" className="text-fg underline decoration-accent decoration-2 underline-offset-4">
              llms.txt
            </a>
            <span className="text-subtle"> · machine contract</span>
          </p>
        </nav>

        <article className="max-w-xl space-y-14 text-base leading-7 text-muted sm:text-lg sm:leading-8">
          <header className="border-b border-border pb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
              Litepaper v0.1 · 2026-10-22
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-fg sm:text-6xl">
              Mandate
            </h1>
            <p className="mt-3 font-display text-xl text-muted sm:text-2xl">
              The agent can ask. It cannot sign.
            </p>
            <p className="mt-6 text-sm leading-6 text-subtle">
              Tracks: AI Security &amp; Defense · Agent Economy · Autonomous Business (NEAR HACKATHON 2026).
              Repo:{" "}
              <a
                href="https://github.com/arults/Mandate"
                className="text-fg underline"
                rel="noreferrer"
                target="_blank"
              >
                github.com/arults/Mandate
              </a>
              . Agent contract: /llms.txt · AGENT.md.
            </p>
          </header>

          <nav className="border border-border bg-surface p-4 lg:hidden print:hidden" aria-label="On this page">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">On this page</p>
            <ul className="mt-3 columns-1 gap-x-6 space-y-1.5 text-sm sm:columns-2">
              {sections.map((section) => (
                <li key={section.id} className="break-inside-avoid">
                  <a href={`#${section.id}`} className="text-fg hover:underline">
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="abstract" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">1. Abstract</h2>
            <p className="mt-4">
              One human-authored spending mandate. Agents propose payments over a single HTTP surface. A policy
              gate outside the model returns allow, needs_approval, or reject. Signing keys stay out of the
              agent (production: OutLayer Intel TDX / NEAR MPC; preview: local gate with the same decision
              shape). Settlement path is NEAR Intents. Prompt injection cannot raise caps, swap recipients, or
              mark a payment approved.
            </p>
          </section>

          <section id="problem" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">2. Problem</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>
                Agents that hold raw keys are steerable — prompt injection, poisoned tools, malicious 402 / MCP
                text.
              </li>
              <li>
                System-prompt “limits” are requests, not locks: untestable, no artefact, they degrade under
                attack.
              </li>
              <li>
                Cross-chain agent commerce needs Intents-class rails without giving the model a FullAccess key.
              </li>
              <li>
                Autonomous businesses need <strong className="font-medium text-fg">human constraints</strong>{" "}
                with <strong className="font-medium text-fg">machine speed</strong> under the line.
              </li>
            </ul>
          </section>

          <section id="thesis" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">3. Thesis</h2>
            <p className="mt-4">
              <strong className="font-medium text-fg">Authorization is not a language-model problem.</strong> It
              is a gate problem. The model proposes{" "}
              <span className="font-mono text-base text-fg">
                {"{amount, asset, to, chain, purpose}"}
              </span>
              ; something that is not the model decides.
            </p>
          </section>

          <section id="threat" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">4. Threat model</h2>
            <div className="mt-4 overflow-x-auto border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm leading-6">
                <thead className="bg-elevated text-fg">
                  <tr>
                    <th className="border-b border-border px-3 py-2.5 font-medium">Adversary</th>
                    <th className="border-b border-border px-3 py-2.5 font-medium">Capability</th>
                    <th className="border-b border-border px-3 py-2.5 font-medium">Mandate control</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">Prompt-injected agent</td>
                    <td className="border-b border-border px-3 py-2.5">Steers tool args</td>
                    <td className="border-b border-border px-3 py-2.5">
                      Gate recomputes; ignores approved / policy
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">Malicious merchant / tool text</td>
                    <td className="border-b border-border px-3 py-2.5">Inflates amount or swaps payee</td>
                    <td className="border-b border-border px-3 py-2.5">Allow-list + caps + approval line</td>
                  </tr>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">
                      Agent with code exec + raw signer
                    </td>
                    <td className="border-b border-border px-3 py-2.5">Bypass any in-process hook</td>
                    <td className="border-b border-border px-3 py-2.5">
                      Out of preview threat model; production requires out-of-process signer (OutLayer)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 text-fg">Operator mistake</td>
                    <td className="px-3 py-2.5">Over-wide allow-list</td>
                    <td className="px-3 py-2.5">Freeze; approval threshold; day limits</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-6">
              Honest non-goals: not a full sandbox; not KYC; not antifraud ML.
            </p>
          </section>

          <section id="architecture" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">5. Architecture</h2>
            <pre className="mt-4 overflow-x-auto border border-border bg-surface p-4 font-mono text-xs leading-6 text-fg sm:text-sm">
              {`Human console → policy / fund / approve
Agent → POST /api/v1/pay only
        ↓
   policy gate (not LLM)
        ↓
 allow | needs_approval | reject
        ↓
 receipt + Intents path (preview: not broadcast)`}
            </pre>
            <p className="mt-4 text-sm leading-6">
              Components: policy types · evaluatePolicy · gate.server · human routes · agent route · console ·
              docs · llms.txt.
            </p>
          </section>

          <section id="policy" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">6. Policy object</h2>
            <p className="mt-4">
              Fields:{" "}
              <span className="font-mono text-base text-fg">
                maxPerTransactionUsd, dailyLimitUsd, allowedRecipients[], approvalThresholdUsd, allowedAssets
                (USDC), frozen
              </span>
              .
            </p>
            <p className="mt-4">
              Evaluation order (matches code): frozen → asset → chain → recipient → balance/holds → max/tx →
              daily remaining → approval threshold.
            </p>
            <p className="mt-4">
              Enclave document mapping (<span className="font-mono text-base text-fg">enclaveDocument</span>):
              OutLayer-shaped rules +{" "}
              <span className="font-mono text-base text-fg">mandate_only.approval_threshold_usd</span> +{" "}
              <span className="font-mono text-base text-fg">evaluated_by</span>. Preview labels{" "}
              <span className="font-mono text-base text-fg">evaluated_by: &quot;process-memory&quot;</span>.
            </p>
            <p className="mt-4 text-sm leading-6">
              Demo mandate: $25 max per payment, $50 per day, approve above $10. Recipients vendor.near,
              studio.near, and one EVM address. Chains: base, ethereum, arbitrum, solana, polygon, near.
            </p>
          </section>

          <section id="agents" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">7. Agent interface</h2>
            <p className="mt-4">
              Call only <span className="font-mono text-base text-fg">POST /api/v1/pay</span>. Full contract:{" "}
              <a href="/llms.txt" className="text-fg underline">
                /llms.txt
              </a>
              .
            </p>
            <pre className="mt-4 overflow-x-auto border border-border bg-surface p-4 font-mono text-sm leading-6 text-fg">
              {`{
  "amountUsd": 8,
  "asset": "USDC",
  "to": "vendor.near",
  "chain": "base",
  "purpose": "API invoice 14",
  "idempotencyKey": "invoice-14"
}`}
            </pre>
            <p className="mt-4">
              Read <span className="font-mono text-base text-fg">receipt.status</span>. A 200 is a decision, not
              a payment. Do not send approved, policy, a signature, or a key — those fields are ignored.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <span className="font-mono text-base text-fg">allow</span> — inside the policy.{" "}
                <span className="font-mono text-base text-fg">settlement.submitted</span> is false in preview.
              </li>
              <li>
                <span className="font-mono text-base text-fg">needs_approval</span> — wait. Do not retry with a
                higher amount.
              </li>
              <li>
                <span className="font-mono text-base text-fg">reject</span> — blocked.{" "}
                <span className="font-mono text-base text-fg">receipt.rule</span> is the reason.
              </li>
              <li>
                <span className="font-mono text-base text-fg">cancelled</span> — human rejected, day changed, or
                wallet frozen.
              </li>
            </ul>
            <p className="mt-4 text-sm leading-6">
              409 no_policy: human has not saved a mandate. 409 conflict: idempotency key reused for a different
              body. 400: invalid body.
            </p>
          </section>

          <section id="humans" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">8. Human interface</h2>
            <p className="mt-4">
              The <Link to="/console" className="text-fg underline">console</Link> owns policy, fund, and
              approve / reject. HTTP human routes require{" "}
              <span className="font-mono text-base text-fg">MANDATE_HUMAN_TOKEN</span>.
            </p>
            <p className="mt-4">
              Production path: publish the policy into OutLayer Agent Custody. The agent keeps a request key (
              <span className="font-mono text-base text-fg">wk_</span>) only — it can ask, it cannot rewrite the
              mandate.
            </p>
          </section>

          <section id="settlement" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">9. Settlement &amp; NEAR</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>Protocol: NEAR Intents / 1-Click quote shape.</li>
              <li>
                Optional OutLayer <span className="font-mono text-base text-fg">intents/withdraw</span> dry-run;
                spend only if <span className="font-mono text-base text-fg">would_succeed: true</span>.
              </li>
              <li>
                Preview: <span className="font-mono text-base text-fg">settlement.submitted = false</span> always.
              </li>
              <li>Production path: OutLayer Agent Custody + Intents (partner docs).</li>
              <li>
                Composition with Function Call Keys: agent never holds FullAccess (roadmap / security-track
                section).
              </li>
            </ul>
          </section>

          <section id="safety" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">10. Safety properties</h2>
            <p className="mt-4 text-sm leading-6">
              Claim only what tests cover (LOGBOOK · policy.test.ts · gate.security.test.ts):
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>Jailbreak fields ignored.</li>
              <li>Caps cannot be overridden by a human-approval flag alone.</li>
              <li>Holds prevent day oversubscription.</li>
              <li>Idempotency conflict on body mismatch.</li>
              <li>OutLayer false dry-run does not spend.</li>
              <li>At most 20 payments can wait; UTC day change cancels pending and releases holds.</li>
              <li>HTTP 429 and 5xx can be retried; they are not stored as a no.</li>
            </ul>
          </section>

          <section id="limits" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">11. Limits of this preview</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>It does not give the agent a private key.</li>
              <li>It does not treat the model, or a field named approved, as authorization.</li>
              <li>It does not broadcast a mainnet transaction or invent a solver fill.</li>
              <li>
                The gate is one process, in memory (<span className="font-mono text-base text-fg">process-memory</span>
                ). A restart forgets policy, balance, and ledger.
              </li>
              <li>
                No TEE attestation unless an OutLayer dry-run returns{" "}
                <span className="font-mono text-base text-fg">would_succeed: true</span>. Without a key,
                attestation kind is local-policy-gate.
              </li>
              <li>No marketplace, second agent, KYC, or fiat ramp.</li>
            </ul>
          </section>

          <section id="line" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">12. Product line (FORGE)</h2>
            <div className="mt-4 overflow-x-auto border border-border">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm leading-6">
                <thead className="bg-elevated text-fg">
                  <tr>
                    <th className="border-b border-border px-3 py-2.5 font-medium">Product</th>
                    <th className="border-b border-border px-3 py-2.5 font-medium">One-liner</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">Mandate</td>
                    <td className="border-b border-border px-3 py-2.5">Policy gate for agent spend (this submission)</td>
                  </tr>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">Mandate Receipts × ActSeal</td>
                    <td className="border-b border-border px-3 py-2.5">
                      Cryptographic / audit seal of allow / reject receipts (roadmap)
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-border px-3 py-2.5 text-fg">Mandate Pool</td>
                    <td className="border-b border-border px-3 py-2.5">
                      Multi-agent shared daily budget + per-agent subcaps (roadmap)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 text-fg">Mandate Lists</td>
                    <td className="px-3 py-2.5">Versioned allowlists humans subscribe to (roadmap)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-6">Same trust boundary. Different surfaces. Not shipped as products yet.</p>
          </section>

          <section id="demo" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">13. Hackathon demo protocol</h2>
            <p className="mt-4">Do X → see Y. Judges: open live URL or clone → Run the agent → Approve → inspect receipt.</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>
                <strong className="font-medium text-fg">Run the agent.</strong> Publishes the demo mandate.
                Remaining today $50. Balance $200. Running again resets today&apos;s spend and pending; it does
                not erase the ledger.
              </li>
              <li>
                <strong className="font-medium text-fg">$8 to vendor.near on Base</strong> → Allowed. Attestation
                says local policy gate (unless OutLayer dry-run would_succeed). submitted stays false. Remaining
                $42.
              </li>
              <li>
                <strong className="font-medium text-fg">$18 to studio.near</strong> → Needs approval. Remaining
                drops because the amount is held. Balance stays $200 until Approve. Reject releases the hold.
              </li>
              <li>
                <strong className="font-medium text-fg">$40</strong> → Blocked · max_per_transaction.
              </li>
              <li>
                <strong className="font-medium text-fg">Jailbreak</strong> → body includes approved: true and a
                fake policy. Receipt lists those as ignored. Status Blocked · allowed_recipients.
              </li>
            </ol>
          </section>

          <section id="roadmap" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">14. Roadmap</h2>
            <p className="mt-4">
              <strong className="font-medium text-fg">Near:</strong> persistence or export · live 1-Click quote ·
              multi-agent caps · OutLayer publish · Function Call Key composition story.
            </p>
            <p className="mt-4">
              <strong className="font-medium text-fg">Later:</strong> on-chain encrypted policy verify page · swarm
              markets · allowlist marketplace.
            </p>
          </section>

          <section id="refs" className="scroll-mt-28">
            <h2 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">15. References</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
              <li>
                <a href="https://nearhackathon.com/HACKATHON.md" className="text-fg underline" rel="noreferrer" target="_blank">
                  nearhackathon.com/HACKATHON.md
                </a>
              </li>
              <li>
                <a href="https://docs.near-intents.org/" className="text-fg underline" rel="noreferrer" target="_blank">
                  docs.near-intents.org
                </a>
              </li>
              <li>
                <a href="https://app.outlayer.ai/docs/agent-custody" className="text-fg underline" rel="noreferrer" target="_blank">
                  OutLayer Agent Custody
                </a>
              </li>
              <li>
                <a href="https://docs.near.org/protocol/accounts-contracts/access-keys" className="text-fg underline" rel="noreferrer" target="_blank">
                  NEAR access keys / Function Call Keys
                </a>
              </li>
              <li>Repo LOGBOOK.txt · AGENT.md · /llms.txt</li>
            </ul>
            <p className="mt-8 border-t border-border pt-6 text-sm leading-6 text-subtle">
              Contact / team: FORGE · arults. Fill submit contact before the 1–14 Nov 2026 UTC window. Do not
              invent emails in copy.
            </p>
          </section>
        </article>
      </div>
      <SiteFooter />
    </>
  );
}
