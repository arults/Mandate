import { createHash } from "node:crypto";

import type { GateReceipt, Settlement } from "@/lib/gate-types";
import { normalizeRecipient, type HumanPolicy } from "@/lib/policy";

export type PrivacyMode = "full" | "minimize";
export type ReceiptView = "agent" | "human";

export type PublicPaymentRequest = {
  amountUsd: number;
  asset: string;
  to: string;
  chain: string;
  /** Raw purpose for humans / full mode. Null when minimized for agents. */
  purpose: string | null;
  purposeHash?: string;
  recipientHash?: string;
};

export type PublicGateReceipt = Omit<GateReceipt, "request" | "settlement"> & {
  request: PublicPaymentRequest;
  settlement: Settlement | null;
  privacyMode: PrivacyMode;
};

export function normalizePurpose(purpose: string): string {
  return purpose.normalize("NFC").trim().slice(0, 140);
}

export function hashPurpose(purpose: string): string {
  return createHash("sha256").update(normalizePurpose(purpose), "utf8").digest("hex");
}

export function hashRecipient(to: string): string {
  return createHash("sha256").update(normalizeRecipient(to), "utf8").digest("hex");
}

/** Truncate for agent-visible receipts. Never invent a different account. */
export function truncateRecipient(to: string): string {
  const value = normalizeRecipient(to);
  if (/^0x[0-9a-f]{40}$/.test(value)) {
    return "0x" + value.slice(2, 6) + "..." + value.slice(-4);
  }
  if (value.endsWith(".near")) {
    const body = value.slice(0, -".near".length);
    const first = body.split(".")[0] || body;
    const suffix = hashRecipient(value).slice(0, 8);
    return first + "..." + suffix + ".near";
  }
  if (value.length <= 10) return value;
  return value.slice(0, 4) + "..." + value.slice(-4);
}

function scrubText(text: string, fullTo: string, truncatedTo: string, purpose: string): string {
  let next = text.split(fullTo).join(truncatedTo);
  const trimmed = purpose.trim();
  if (trimmed.length >= 3) {
    next = next.split(trimmed).join("[purpose]");
  }
  return next;
}

function projectSettlement(
  settlement: Settlement | null,
  truncatedTo: string,
): Settlement | null {
  if (!settlement) return null;
  return { ...settlement, recipient: truncatedTo };
}

/**
 * Project a stored (full) receipt for a viewer.
 * Agents never receive raw purpose or full recipient when policy.privacyMode is minimize.
 * Humans always get the full receipt. privacyMode on the agent body is ignored elsewhere.
 * forceMinimize: public share links ignore live policy.privacyMode=full.
 */
export function projectReceipt(
  receipt: GateReceipt,
  policy: HumanPolicy | null | undefined,
  view: ReceiptView,
  opts?: { forceMinimize?: boolean },
): PublicGateReceipt {
  const mode: PrivacyMode =
    opts?.forceMinimize ? "minimize" : policy?.privacyMode === "full" ? "full" : "minimize";
  if (!opts?.forceMinimize && (view === "human" || mode === "full")) {
    return {
      ...receipt,
      request: {
        ...receipt.request,
        purpose: receipt.request.purpose,
        purposeHash: hashPurpose(receipt.request.purpose),
        recipientHash: hashRecipient(receipt.request.to),
      },
      privacyMode: mode,
    };
  }

  const fullTo = receipt.request.to;
  const truncatedTo = truncateRecipient(fullTo);
  const purposeHash = hashPurpose(receipt.request.purpose);
  const recipientHash = hashRecipient(fullTo);
  const detail = scrubText(receipt.detail, fullTo, truncatedTo, receipt.request.purpose);
  const statement = scrubText(
    receipt.attestation.statement,
    fullTo,
    truncatedTo,
    receipt.request.purpose,
  );

  return {
    ...receipt,
    request: {
      amountUsd: receipt.request.amountUsd,
      asset: receipt.request.asset,
      to: truncatedTo,
      chain: receipt.request.chain,
      purpose: null,
      purposeHash,
      recipientHash,
    },
    detail,
    attestation: {
      ...receipt.attestation,
      statement,
    },
    settlement: projectSettlement(receipt.settlement, truncatedTo),
    privacyMode: "minimize",
  };
}

export function projectLedger(
  ledger: GateReceipt[],
  policy: HumanPolicy | null | undefined,
  view: ReceiptView,
): PublicGateReceipt[] {
  return ledger.map((item) => projectReceipt(item, policy, view));
}
