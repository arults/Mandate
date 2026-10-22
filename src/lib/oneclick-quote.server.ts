/**
 * Read-only NEAR Intents 1-Click dry quote. Never broadcasts.
 * Graceful degrade when the API is down or returns an error.
 */
import { usdToUsdcUnits, type PaymentRequest } from "@/lib/policy";

/** Native NEAR USDC on Intents (from GET /v0/tokens). */
export const NEAR_USDC_ASSET =
  "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

const DEST_USDC: Record<string, string> = {
  near: NEAR_USDC_ASSET,
  ethereum: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
  arbitrum: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  base: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  solana: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  // polygon USDC via HOT omnichain (pol) — may change; degrade if quote fails
  polygon: "nep245:v2_1.omni.hot.tg:137_qiStmoQJDQPTebaPjgx5VBxZv6L",
};

export const ONECLICK_QUOTE_URL = "https://1click.chaindefuser.com/v0/quote";

export type OneClickQuoteResult = {
  status: "ok" | "unavailable" | "skipped";
  correlationId: string | null;
  amountOut: string | null;
  amountOutFormatted: string | null;
  amountOutUsd: string | null;
  destinationAsset: string | null;
  note: string;
};

function quotesEnabled(): boolean {
  const raw = (process.env.MANDATE_1CLICK_QUOTE ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "off" || raw === "false" || raw === "no");
}

function recipientType(to: string): "DESTINATION_CHAIN" | "INTENTS" {
  return /^0x[0-9a-fA-F]{40}$/.test(to) ? "DESTINATION_CHAIN" : "INTENTS";
}

export async function fetchOneClickQuote(request: PaymentRequest): Promise<OneClickQuoteResult> {
  if (!quotesEnabled()) {
    return {
      status: "skipped",
      correlationId: null,
      amountOut: null,
      amountOutFormatted: null,
      amountOutUsd: null,
      destinationAsset: null,
      note: "1-Click quote skipped (MANDATE_1CLICK_QUOTE off).",
    };
  }

  const destinationAsset = DEST_USDC[request.chain];
  if (!destinationAsset) {
    return {
      status: "unavailable",
      correlationId: null,
      amountOut: null,
      amountOutFormatted: null,
      amountOutUsd: null,
      destinationAsset: null,
      note: `No 1-Click USDC asset mapping for chain ${request.chain}.`,
    };
  }

  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const refundTo = request.to.toLowerCase().endsWith(".near") ? request.to.toLowerCase() : "mandate-demo.near";
  const body = {
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: NEAR_USDC_ASSET,
    depositType: "INTENTS",
    destinationAsset,
    amount: usdToUsdcUnits(request.amountUsd),
    refundTo,
    refundType: "INTENTS",
    recipient: request.to,
    recipientType: recipientType(request.to),
    deadline,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(ONECLICK_QUOTE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = (await res.text()).slice(0, 4000);
    let record: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") record = parsed as Record<string, unknown>;
    } catch {
      record = null;
    }

    if (!res.ok || !record) {
      const message =
        typeof record?.message === "string" ? record.message : text.slice(0, 180) || `HTTP ${res.status}`;
      return {
        status: "unavailable",
        correlationId: typeof record?.correlationId === "string" ? record.correlationId : null,
        amountOut: null,
        amountOutFormatted: null,
        amountOutUsd: null,
        destinationAsset,
        note: `1-Click quote unavailable (${res.status}). ${message}`,
      };
    }

    const quote = record.quote && typeof record.quote === "object" ? (record.quote as Record<string, unknown>) : null;
    const correlationId = typeof record.correlationId === "string" ? record.correlationId : null;
    const amountOut = typeof quote?.amountOut === "string" ? quote.amountOut : null;
    const amountOutFormatted = typeof quote?.amountOutFormatted === "string" ? quote.amountOutFormatted : null;
    const amountOutUsd = typeof quote?.amountOutUsd === "string" ? quote.amountOutUsd : null;

    if (!correlationId || !amountOut) {
      return {
        status: "unavailable",
        correlationId,
        amountOut,
        amountOutFormatted,
        amountOutUsd,
        destinationAsset,
        note: "1-Click quote response missing correlationId or amountOut.",
      };
    }

    return {
      status: "ok",
      correlationId,
      amountOut,
      amountOutFormatted,
      amountOutUsd,
      destinationAsset,
      note: `1-Click dry quote ${correlationId}: out ${amountOutFormatted ?? amountOut} USDC (≈ $${amountOutUsd ?? "?"}). Not submitted.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "quote failed";
    return {
      status: "unavailable",
      correlationId: null,
      amountOut: null,
      amountOutFormatted: null,
      amountOutUsd: null,
      destinationAsset,
      note: `1-Click quote did not complete. ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
