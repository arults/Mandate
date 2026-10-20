import { SiteNav } from "@/components/site-nav";

const sections = [
  { id: "about", label: "About" },
  { id: "problem", label: "Problem" },
  { id: "decision", label: "Decision" },
  { id: "humans", label: "For humans" },
  { id: "agents", label: "For agents" },
  { id: "safety", label: "Safety" },
  { id: "limits", label: "Limits" },
];

export function Docs() {
  return (
    <>
      <SiteNav current="docs" />
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-12 sm:py-16 lg:grid-cols-[12rem_minmax(0,42rem)]">
        <nav className="text-sm lg:sticky lg:top-8 lg:self-start" aria-label="Documentation">
          <p className="text-muted">Docs</p>
          <ul className="mt-4 space-y-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-fg hover:underline">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-muted">
            <a href="/llms.txt" className="text-fg hover:underline">
              llms.txt
            </a>
          </p>
        </nav>

        <article className="max-w-xl space-y-16 text-lg leading-relaxed text-muted">
          <header>
            <h1 className="text-4xl font-medium leading-tight tracking-tight text-fg sm:text-6xl">
              Mandate, in one page.
            </h1>
            <p className="mt-6">
              A human sets a spending policy. An agent can ask to pay. The policy is enforced outside the
              model.
            </p>
          </header>

          <section id="about" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">About</h2>
            <p className="mt-4">
              Mandate is a policy-protected agent wallet for the NEAR hackathon. The preview gate is a local
              stand-in for an OutLayer TEE wallet. It makes the same kind of decision. It does not hold a
              production key.
            </p>
          </section>

          <section id="problem" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">The problem</h2>
            <p className="mt-4">
              Agents that hold a raw key can be talked out of it. A system prompt is not a lock. Mandate keeps
              the signing step away from the agent. The agent submits a payment. Something that is not the LLM
              answers.
            </p>
          </section>

          <section id="decision" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">How a payment is decided</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>Frozen wallets stop first.</li>
              <li>USDC only. Destination chain must be one the demo will quote.</li>
              <li>The recipient must already be on the allow-list.</li>
              <li>The amount must fit the balance, the per-payment cap, and what remains of the day.</li>
              <li>Above the approval line, a human has to say yes. The amount is held. It is not spent.</li>
            </ol>
            <p className="mt-4">
              Demo mandate: $25 max per payment, $50 per day, approve above $10. Recipients are vendor.near,
              studio.near, and one EVM address.
            </p>
          </section>

          <section id="humans" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">For humans</h2>
            <p className="mt-4">Open the console and run the four checks in order.</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>Prepare the demo. Remaining today is $50. Balance is $200.</li>
              <li>Allowed · $8 to Base. Remaining becomes $42. Nothing was broadcast.</li>
              <li>
                Approval · $18 to Ethereum. Remaining drops to $32 because the amount is held. Balance stays
                $200 until you approve. Reject gives the hold back.
              </li>
              <li>Blocked · $40 over the cap. Remaining does not change.</li>
              <li>
                Jailbreak. The body includes approved: true and a fake policy. Those fields are ignored. The
                recipient is not on the list, so the payment is blocked.
              </li>
            </ol>
            <p className="mt-4">
              Save policy and Add funds live on the console. The HTTP routes for policy, funding, and
              approvals stay closed unless the server has a human token.
            </p>
          </section>

          <section id="agents" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">For agents</h2>
            <p className="mt-4">
              Call only <span className="font-mono text-base text-fg">POST /api/v1/pay</span>. A full copy of
              this contract is at <a href="/llms.txt">/llms.txt</a>.
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
              Read <span className="font-mono text-base text-fg">receipt.status</span>. A 200 is a decision,
              not a payment. Do not send approved, policy, a signature, or a key. Those fields are ignored.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>allow — inside the policy. settlement.submitted is false.</li>
              <li>needs_approval — wait. Do not retry with a higher amount.</li>
              <li>reject — blocked. receipt.rule is the reason.</li>
              <li>cancelled — a human rejected it, or the day changed, or the wallet was frozen.</li>
            </ul>
            <p className="mt-4">
              409 no_policy means the human has not saved a mandate. 409 conflict means this idempotency key
              was already used for a different payment. 400 means the body itself is invalid.
            </p>
          </section>

          <section id="safety" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">Safety</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>The same idempotency key does not pay twice, even after the row leaves the visible ledger.</li>
              <li>A hold counts against today’s limit and against the available balance.</li>
              <li>At most 20 payments can wait.</li>
              <li>OutLayer is accepted only when would_succeed is true. A refusal does not spend.</li>
              <li>HTTP 429 and 5xx can be retried. They are not stored as a no.</li>
              <li>Recipients are plain ASCII: a NEAR account, a 20-byte hex address, or a base58 address.</li>
              <li>.near names match regardless of case. Amounts are at least $0.01 and at most $1,000,000.</li>
            </ul>
          </section>

          <section id="limits" className="scroll-mt-8">
            <h2 className="text-2xl font-medium text-fg">What this preview does not do</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5">
              <li>It does not give the agent a private key.</li>
              <li>It does not treat the model, or a field named approved, as authorization.</li>
              <li>It does not broadcast a mainnet transaction.</li>
              <li>The gate is one process, in memory. Prepare the demo to start a clean day.</li>
            </ul>
            <p className="mt-6 text-sm">
              In production the human publishes the policy into OutLayer Agent Custody. The agent keeps a
              request key. The rule is the same: the key can ask, it cannot rewrite the mandate.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
