import assert from "node:assert/strict";
import test from "node:test";

import type { Settlement } from "./gate-types.ts";
import { copyableDryQuoteId, intentsOptics } from "./intents-optics.ts";

function settlement(quote: Settlement["quote"]): Settlement {
  return {
    protocol: "near-intents-1click",
    submitted: false,
    sourceChain: "near",
    destinationChain: "base",
    asset: "USDC",
    token: "nep141:usdc.near",
    amountUnits: "80000000",
    recipient: "hotel.near",
    calls: [],
    live: null,
    quote,
  };
}

test("an allow row states submitted false and never invents a transaction hash", () => {
  const lines = intentsOptics(
    settlement({
      status: "ok",
      correlationId: "quote-1",
      amountOut: "79990000",
      amountOutFormatted: "79.99",
      amountOutUsd: "79.99",
      destinationAsset: "usdc",
      note: "dry",
    }),
  );
  assert.ok(lines);
  assert.equal(lines!.submitted, "false");
  assert.equal(lines!.txHash, "none");
  assert.equal(lines!.path, "near → base");
  assert.equal(lines!.dryQuote, "quote-1");
  assert.equal(lines!.out, "79.99 USDC");
  assert.equal("txHash" in lines! && lines!.txHash === "none", true);
  assert.equal(copyableDryQuoteId(lines), "quote-1");
});

test("a missing dry quote stays honest", () => {
  const lines = intentsOptics(
    settlement({
      status: "unavailable",
      correlationId: null,
      amountOut: null,
      amountOutFormatted: null,
      amountOutUsd: null,
      destinationAsset: null,
      note: "1-Click quote did not complete.",
    }),
  );
  assert.equal(lines!.submitted, "false");
  assert.equal(lines!.dryQuote, "not returned");
  assert.equal(lines!.out, null);
  assert.equal(lines!.txHash, "none");
  assert.equal(intentsOptics(null), null);
  assert.equal(copyableDryQuoteId(lines), null);
  assert.equal(copyableDryQuoteId(null), null);
  assert.equal(
    copyableDryQuoteId({
      submitted: "false",
      path: "near → base",
      dryQuote: "not returned",
      out: null,
      txHash: "none",
    }),
    null,
  );
});
