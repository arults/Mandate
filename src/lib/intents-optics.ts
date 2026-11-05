import type { Settlement } from "@/lib/gate-types";

/** Fields the calm allow row shows. submitted is always false in this preview. */
export type IntentsOptics = {
  submitted: "false";
  path: string;
  dryQuote: string;
  out: string | null;
  txHash: "none";
};

export function intentsOptics(settlement: Settlement | null | undefined): IntentsOptics | null {
  if (!settlement) return null;
  const quote = settlement.quote;
  const quoted = quote?.status === "ok" && quote.correlationId ? quote : null;
  return {
    submitted: "false",
    path: `${settlement.sourceChain} → ${settlement.destinationChain}`,
    dryQuote: quoted ? quoted.correlationId! : "not returned",
    out: quoted?.amountOutFormatted ? `${quoted.amountOutFormatted} USDC` : null,
    txHash: "none",
  };
}

/**
 * A real dry-quote id the calm path can copy.
 * "not returned" is not an id. This never yields a transaction hash.
 */
export function copyableDryQuoteId(lines: IntentsOptics | null): string | null {
  if (!lines || lines.submitted !== "false" || lines.txHash !== "none") return null;
  if (lines.dryQuote === "not returned" || lines.dryQuote.trim() === "") return null;
  return lines.dryQuote;
}
