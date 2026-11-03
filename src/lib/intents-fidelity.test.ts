import assert from "node:assert/strict";
import test from "node:test";

import type { Settlement } from "./gate-types.ts";
import { copyableDryQuoteId, intentsOptics } from "./intents-optics.ts";
import { fetchOneClickQuote, NEAR_USDC_ASSET, ONECLICK_QUOTE_URL } from "./oneclick-quote.server.ts";
import type { PaymentRequest } from "./policy.ts";

const hotelOnBase: PaymentRequest = {
  amountUsd: 80,
  asset: "USDC",
  to: "hotel.near",
  chain: "base",
  purpose: "Airport night",
};

function settlementFromQuote(quote: Awaited<ReturnType<typeof fetchOneClickQuote>>): Settlement {
  return {
    protocol: "near-intents-1click",
    submitted: false,
    sourceChain: "near",
    destinationChain: "base",
    asset: "USDC",
    token: "nep141:usdc.near",
    amountUnits: "80000000",
    recipient: "hotel.near",
    calls: [`POST ${ONECLICK_QUOTE_URL}`],
    live: null,
    quote,
  };
}

function withFetch(impl: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  process.env.MANDATE_1CLICK_QUOTE = "1";
  globalThis.fetch = impl;
  return run().finally(() => {
    globalThis.fetch = original;
    process.env.MANDATE_1CLICK_QUOTE = "0";
  });
}

test("a recorded 1-Click dry quote composes near to base and never a transaction hash", async () => {
  let sent: { url: string; body: Record<string, unknown> } | null = null;
  await withFetch(async (input, init) => {
    sent = { url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> };
    return new Response(
      JSON.stringify({
        correlationId: "f6f402fe-7a48-4c76-963d-70f9c35e0a8d",
        quote: {
          amountOut: "79989138",
          amountOutFormatted: "79.989138",
          amountOutUsd: "79.94",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }, async () => {
    const quote = await fetchOneClickQuote(hotelOnBase);
    assert.equal(quote.status, "ok");
    assert.equal(quote.correlationId, "f6f402fe-7a48-4c76-963d-70f9c35e0a8d");
    assert.equal("txHash" in quote, false);
    assert.equal("transactionHash" in quote, false);
    assert.equal(sent?.url, ONECLICK_QUOTE_URL);
    assert.equal(sent?.body.dry, true);
    assert.equal(sent?.body.originAsset, NEAR_USDC_ASSET);
    assert.equal(sent?.body.destinationAsset, "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near");
    assert.equal(sent?.body.amount, "80000000");
    assert.equal(sent?.body.recipient, "hotel.near");

    const lines = intentsOptics(settlementFromQuote(quote));
    assert.equal(lines?.submitted, "false");
    assert.equal(lines?.path, "near → base");
    assert.equal(lines?.txHash, "none");
    assert.equal(lines?.dryQuote, "f6f402fe-7a48-4c76-963d-70f9c35e0a8d");
    assert.equal(lines?.out, "79.989138 USDC");
    assert.equal(copyableDryQuoteId(lines), quote.correlationId);
  });
});

test("a dry quote without a correlation id stays absent and still has no transaction hash", async () => {
  await withFetch(async () => {
    return new Response(JSON.stringify({ quote: { amountOut: "1" } }), { status: 200 });
  }, async () => {
    const quote = await fetchOneClickQuote(hotelOnBase);
    assert.equal(quote.status, "unavailable");
    assert.equal(quote.correlationId, null);
    assert.equal("txHash" in quote, false);
    const lines = intentsOptics(settlementFromQuote(quote));
    assert.equal(lines?.submitted, "false");
    assert.equal(lines?.path, "near → base");
    assert.equal(lines?.txHash, "none");
    assert.equal(lines?.dryQuote, "not returned");
    assert.equal(copyableDryQuoteId(lines), null);
  });
});

test("a failed 1-Click response does not invent a quote id or a transaction hash", async () => {
  await withFetch(async () => new Response("upstream down", { status: 503 }), async () => {
    const quote = await fetchOneClickQuote(hotelOnBase);
    assert.equal(quote.status, "unavailable");
    assert.equal(quote.correlationId, null);
    assert.match(quote.note, /unavailable/);
    assert.equal("txHash" in quote, false);
    const lines = intentsOptics(settlementFromQuote(quote));
    assert.equal(lines?.submitted, "false");
    assert.equal(lines?.txHash, "none");
    assert.equal(copyableDryQuoteId(lines), null);
  });
});
