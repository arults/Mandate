import assert from "node:assert/strict";
import test from "node:test";

import {
  awaitGateReady,
  forgetGateMemoryForTests,
  prepareDemo,
  resetGateForTests,
  snapshot,
  submitPayment,
} from "./gate.server.ts";
import { fetchOneClickQuote } from "./oneclick-quote.server.ts";

const demo = {
  maxPerTransactionUsd: 25,
  dailyLimitUsd: 50,
  allowedRecipients: ["vendor.near", "studio.near", "0x1111111111111111111111111111111111111111"],
  approvalThresholdUsd: 10,
  allowedAssets: ["USDC"] as ["USDC"],
  frozen: false,
};

function pay(overrides: Record<string, unknown> = {}) {
  return {
    amountUsd: 8,
    asset: "USDC",
    to: "vendor.near",
    chain: "base",
    purpose: "invoice",
    ...overrides,
  };
}

test.beforeEach(async () => {
  await resetGateForTests();
  await prepareDemo(demo);
});

test("local-db-ephemeral (in-memory PGLite) survives clearing process memory in-isolate", async () => {
  const receipt = await submitPayment(pay({ idempotencyKey: "persist-1" }));
  assert.equal(receipt.status, "allow");
  assert.equal(snapshot().balanceUsd, 192);
  assert.equal(snapshot().durability, "local-db-ephemeral");

  await forgetGateMemoryForTests();
  const restored = await awaitGateReady();
  assert.equal(restored.durability, "local-db-ephemeral");
  assert.equal(restored.balanceUsd, 192);
  assert.equal(restored.remainingDailyUsd, 42);
  assert.equal(restored.policy?.dailyLimitUsd, 50);
  assert.ok(restored.ledger.some((row) => row.id === receipt.id));

  const again = await submitPayment(pay({ idempotencyKey: "persist-1" }));
  assert.equal(again.id, receipt.id);
  assert.equal(snapshot().balanceUsd, 192);
});

test("process-memory mode does not reload after forget", async () => {
  process.env.MANDATE_DURABILITY = "process-memory";
  try {
    await resetGateForTests();
    process.env.MANDATE_DURABILITY = "process-memory";
    await prepareDemo(demo);
    await submitPayment(pay());
    assert.equal(snapshot().durability, "process-memory");
    assert.equal(snapshot().balanceUsd, 192);

    await forgetGateMemoryForTests();
    const restored = await awaitGateReady();
    assert.equal(restored.durability, "process-memory");
    assert.equal(restored.balanceUsd, 0);
    assert.equal(restored.policy, null);
  } finally {
    process.env.MANDATE_DURABILITY = "local-db";
  }
});

test("1-Click quote ok attaches correlation id and keeps submitted false", async () => {
  process.env.MANDATE_1CLICK_QUOTE = "1";
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("1click.chaindefuser.com")) {
      return new Response(
        JSON.stringify({
          correlationId: "quote-test-1",
          quote: {
            amountOut: "7996000",
            amountOutFormatted: "7.996",
            amountOutUsd: "7.99",
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  try {
    const receipt = await submitPayment(pay({ purpose: "quoted" }));
    assert.equal(receipt.status, "allow");
    assert.equal(receipt.settlement?.submitted, false);
    assert.equal(receipt.settlement?.quote?.status, "ok");
    assert.equal(receipt.settlement?.quote?.correlationId, "quote-test-1");
    assert.equal(receipt.settlement?.quote?.amountOutFormatted, "7.996");
  } finally {
    globalThis.fetch = original;
    process.env.MANDATE_1CLICK_QUOTE = "0";
  }
});

test("1-Click quote degrades when the API is down", async () => {
  process.env.MANDATE_1CLICK_QUOTE = "1";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;
  try {
    const receipt = await submitPayment(pay({ purpose: "down" }));
    assert.equal(receipt.status, "allow");
    assert.equal(receipt.settlement?.submitted, false);
    assert.equal(snapshot().balanceUsd, 192);
    assert.equal(receipt.settlement?.quote?.status, "unavailable");
    assert.match(receipt.settlement?.quote?.note ?? "", /ECONNREFUSED|did not complete/);
  } finally {
    globalThis.fetch = original;
    process.env.MANDATE_1CLICK_QUOTE = "0";
  }
});

test("fetchOneClickQuote itself returns unavailable on HTTP 500", async () => {
  process.env.MANDATE_1CLICK_QUOTE = "1";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
  try {
    const quote = await fetchOneClickQuote({
      amountUsd: 8,
      asset: "USDC",
      to: "vendor.near",
      chain: "base",
      purpose: "x",
    });
    assert.equal(quote.status, "unavailable");
  } finally {
    globalThis.fetch = original;
    process.env.MANDATE_1CLICK_QUOTE = "0";
  }
});
