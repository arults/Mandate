/** Human-facing policy. The agent never writes this object. */

export const USDC_TOKEN = "nep141:usdc.near";

export const CHAINS = ["base", "ethereum", "arbitrum", "solana", "polygon", "near"] as const;

export type Chain = (typeof CHAINS)[number];

export type HumanPolicy = {
  maxPerTransactionUsd: number;
  dailyLimitUsd: number;
  allowedRecipients: string[];
  approvalThresholdUsd: number;
  allowedAssets: ["USDC"];
  frozen: boolean;
};

export type PaymentRequest = {
  amountUsd: number;
  asset: string;
  to: string;
  chain: string;
  purpose: string;
};

export type DecisionStatus = "allow" | "reject" | "needs_approval";

export type Decision = {
  status: DecisionStatus;
  rule: string | null;
  detail: string;
};

export type Usage = { spentUsd: number; balanceUsd: number };

export const DEMO_POLICY: HumanPolicy = {
  maxPerTransactionUsd: 25,
  dailyLimitUsd: 50,
  allowedRecipients: [
    "vendor.near",
    "studio.near",
    "0x1111111111111111111111111111111111111111",
  ],
  approvalThresholdUsd: 10,
  allowedAssets: ["USDC"],
  frozen: false,
};

export function cents(usd: number): number {
  return Math.round(usd * 100);
}

export function fromCents(value: number): number {
  return value / 100;
}

export function usdToUsdcUnits(usd: number): string {
  return String(cents(usd) * 10_000);
}

export function formatUsd(usd: number): string {
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function normalizeRecipient(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return trimmed.toLowerCase();
  return trimmed;
}

export function policyFingerprint(policy: HumanPolicy): string {
  const canonical = JSON.stringify({
    maxPerTransactionUsd: cents(policy.maxPerTransactionUsd),
    dailyLimitUsd: cents(policy.dailyLimitUsd),
    allowedRecipients: policy.allowedRecipients.map(normalizeRecipient).sort(),
    approvalThresholdUsd: cents(policy.approvalThresholdUsd),
    allowedAssets: policy.allowedAssets,
    frozen: policy.frozen,
  });
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function num(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

export function parsePolicy(input: unknown): HumanPolicy {
  if (!input || typeof input !== "object") throw new Error("Policy must be an object");
  const raw = input as Record<string, unknown>;
  const maxPerTransactionUsd = num(raw.maxPerTransactionUsd, "Max per transaction");
  const dailyLimitUsd = num(raw.dailyLimitUsd, "Daily limit");
  const approvalThresholdUsd = num(raw.approvalThresholdUsd, "Approval threshold");
  if (maxPerTransactionUsd <= 0 || dailyLimitUsd <= 0) {
    throw new Error("Limits must be greater than zero");
  }
  if (approvalThresholdUsd < 0) throw new Error("Approval threshold cannot be negative");
  if (!Array.isArray(raw.allowedRecipients)) throw new Error("Recipients must be a list");
  const allowedRecipients = raw.allowedRecipients
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowedRecipients.length === 0) throw new Error("Add at least one recipient");
  if (allowedRecipients.length > 12) throw new Error("Keep the allow-list to 12 recipients");
  return {
    maxPerTransactionUsd: fromCents(cents(maxPerTransactionUsd)),
    dailyLimitUsd: fromCents(cents(dailyLimitUsd)),
    approvalThresholdUsd: fromCents(cents(approvalThresholdUsd)),
    allowedRecipients,
    allowedAssets: ["USDC"],
    frozen: raw.frozen === true,
  };
}

export function parsePayment(input: unknown): {
  request: PaymentRequest;
  ignoredFields: string[];
  idempotencyKey: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payment request must be an object");
  }
  const raw = input as Record<string, unknown>;
  const known = new Set(["amountUsd", "asset", "to", "chain", "purpose", "idempotencyKey"]);
  const ignoredFields = Object.keys(raw).filter((key) => !known.has(key));
  const amountUsd = num(raw.amountUsd, "Amount");
  if (amountUsd <= 0) throw new Error("Amount must be greater than zero");
  if (Math.abs(amountUsd * 100 - Math.round(amountUsd * 100)) > 1e-6) {
    throw new Error("Use at most 2 decimal places");
  }
  if (typeof raw.asset !== "string" || !raw.asset.trim()) throw new Error("Asset is required");
  if (typeof raw.to !== "string" || !raw.to.trim()) throw new Error("Recipient is required");
  if (typeof raw.chain !== "string" || !raw.chain.trim()) throw new Error("Chain is required");
  const purpose = typeof raw.purpose === "string" ? raw.purpose.trim().slice(0, 140) : "";
  const idempotencyKey =
    typeof raw.idempotencyKey === "string" && raw.idempotencyKey.trim()
      ? raw.idempotencyKey.trim().slice(0, 80)
      : null;
  return {
    request: {
      amountUsd: fromCents(cents(amountUsd)),
      asset: raw.asset.trim(),
      to: raw.to.trim(),
      chain: raw.chain.trim().toLowerCase(),
      purpose,
    },
    ignoredFields,
    idempotencyKey,
  };
}

export function evaluatePolicy(
  policy: HumanPolicy,
  request: PaymentRequest,
  usage: Usage,
  opts?: { honorApproval?: boolean },
): Decision {
  const honorApproval = opts?.honorApproval !== false;
  if (policy.frozen) {
    return { status: "reject", rule: "frozen", detail: "The wallet is frozen. No payment can be signed." };
  }
  const asset = request.asset.trim().toUpperCase();
  if (!policy.allowedAssets.includes(asset as "USDC")) {
    return {
      status: "reject",
      rule: "allowed_assets",
      detail: `${request.asset} is not an allowed asset. This policy settles USDC only.`,
    };
  }
  if (!CHAINS.includes(request.chain as Chain)) {
    return {
      status: "reject",
      rule: "chain",
      detail: `${request.chain} is not a destination this demo will quote.`,
    };
  }
  const recipient = normalizeRecipient(request.to);
  const allowed = new Set(policy.allowedRecipients.map(normalizeRecipient));
  if (!allowed.has(recipient)) {
    return {
      status: "reject",
      rule: "allowed_recipients",
      detail: `${request.to} is not on the allow-list.`,
    };
  }
  if (cents(request.amountUsd) > cents(usage.balanceUsd)) {
    return {
      status: "reject",
      rule: "balance",
      detail: `Demo balance is ${formatUsd(usage.balanceUsd)}. Fund the wallet before this payment.`,
    };
  }
  if (cents(request.amountUsd) > cents(policy.maxPerTransactionUsd)) {
    return {
      status: "reject",
      rule: "max_per_transaction",
      detail: `${formatUsd(request.amountUsd)} is over the ${formatUsd(policy.maxPerTransactionUsd)} per-transaction cap.`,
    };
  }
  const nextSpent = cents(usage.spentUsd) + cents(request.amountUsd);
  if (nextSpent > cents(policy.dailyLimitUsd)) {
    const remaining = Math.max(0, cents(policy.dailyLimitUsd) - cents(usage.spentUsd));
    return {
      status: "reject",
      rule: "daily_limit",
      detail: `${formatUsd(request.amountUsd)} would pass the daily cap. ${formatUsd(fromCents(remaining))} remains today.`,
    };
  }
  if (honorApproval && cents(request.amountUsd) > cents(policy.approvalThresholdUsd)) {
    return {
      status: "needs_approval",
      rule: "approval_threshold",
      detail: `${formatUsd(request.amountUsd)} is over the ${formatUsd(policy.approvalThresholdUsd)} approval line. A human has to approve before anything is signed.`,
    };
  }
  return {
    status: "allow",
    rule: null,
    detail: `${formatUsd(request.amountUsd)} USDC to ${request.to} on ${request.chain} is inside the policy.`,
  };
}
