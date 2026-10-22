/** Human-facing policy. The agent never writes this object. */

export const USDC_TOKEN = "nep141:usdc.near";

export const CHAINS = ["base", "ethereum", "arbitrum", "solana", "polygon", "near"] as const;

export type Chain = (typeof CHAINS)[number];

export type PrivacyMode = "full" | "minimize";

export type HumanPolicy = {
  maxPerTransactionUsd: number;
  dailyLimitUsd: number;
  allowedRecipients: string[];
  approvalThresholdUsd: number;
  allowedAssets: ["USDC"];
  frozen: boolean;
  /** Agent-facing receipts: minimize hides purpose/full recipient. Default minimize. */
  privacyMode: PrivacyMode;
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
  privacyMode: "minimize",
};

export const MAX_USD = 1_000_000;

export function cents(usd: number): number {
  return Math.round(usd * 100);
}

export function fromCents(value: number): number {
  return value / 100;
}

export function usdToUsdcUnits(usd: number): string {
  return String(cents(usd) * 10_000);
}

/** The OutLayer document, plus the approval line this product owns. Not an attestation. */
export function enclaveDocument(policy: HumanPolicy) {
  return {
    version: 1,
    frozen: policy.frozen,
    rules: {
      transaction_types: ["withdraw"],
      allowed_tokens: [USDC_TOKEN],
      addresses: { mode: "whitelist" as const, list: policy.allowedRecipients },
      limits: {
        per_transaction: { [USDC_TOKEN]: usdToUsdcUnits(policy.maxPerTransactionUsd) },
        daily: { "*": usdToUsdcUnits(policy.dailyLimitUsd) },
      },
    },
    mandate_only: {
      approval_threshold_usd: policy.approvalThresholdUsd,
      privacy_mode: policy.privacyMode,
      note: "Above this line the status is needs_approval. The agent cannot sign it. privacy_mode minimize hides purpose/recipient on agent receipts only.",
    },
    evaluated_by: "process-memory" as const,
  };
}

export function formatUsd(usd: number): string {
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function normalizeRecipient(value: string): string {
  const trimmed = value.trim();
  if (/^0x/i.test(trimmed)) return trimmed.toLowerCase();
  if (trimmed.toLowerCase().endsWith(".near")) return trimmed.toLowerCase();
  return trimmed;
}

export function canonicalRecipient(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Recipient is empty");
  if (trimmed.length > 128 || /[^\x21-\x7E]/.test(trimmed)) {
    throw new Error("Recipient must be plain ASCII, with no spaces");
  }
  if (/^0x/i.test(trimmed)) {
    const address = trimmed.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      throw new Error("EVM recipient must be a 20-byte hex address");
    }
    return address;
  }
  if (trimmed.toLowerCase().endsWith(".near")) {
    const account = trimmed.toLowerCase();
    const labels = account.slice(0, -".near".length).split(".");
    const ok = labels.every((label) => /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/.test(label));
    if (!ok || account.length > 64) throw new Error("NEAR recipient is not an account id");
    return account;
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(trimmed)) {
    throw new Error("Recipient must be a NEAR account, a 20-byte hex address, or a base58 address");
  }
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
    privacyMode: policy.privacyMode === "full" ? "full" : "minimize",
  });
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function num(value: unknown, label: string): number {
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    value = Number(value.trim());
  }
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
  if (
    maxPerTransactionUsd > MAX_USD ||
    dailyLimitUsd > MAX_USD ||
    approvalThresholdUsd > MAX_USD
  ) {
    throw new Error("Limits cannot exceed 1000000");
  }
  if (!Array.isArray(raw.allowedRecipients)) throw new Error("Recipients must be a list");
  if (raw.allowedRecipients.some((item) => typeof item !== "string")) {
    throw new Error("Recipients must be strings");
  }
  const allowedRecipients = raw.allowedRecipients.map((item) => canonicalRecipient(item as string));
  if (allowedRecipients.length === 0) throw new Error("Add at least one recipient");
  if (allowedRecipients.length > 12) throw new Error("Keep the allow-list to 12 recipients");
  const privacyMode = raw.privacyMode === "full" ? ("full" as const) : ("minimize" as const);
  return {
    maxPerTransactionUsd: fromCents(cents(maxPerTransactionUsd)),
    dailyLimitUsd: fromCents(cents(dailyLimitUsd)),
    approvalThresholdUsd: fromCents(cents(approvalThresholdUsd)),
    allowedRecipients,
    allowedAssets: ["USDC"],
    frozen: raw.frozen === true,
    privacyMode,
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
  if (amountUsd > MAX_USD) throw new Error("Amount is above the 1000000 ceiling");
  if (cents(amountUsd) < 1) throw new Error("Amount must be at least 0.01");
  if (Math.abs(amountUsd * 100 - Math.round(amountUsd * 100)) > 1e-6) {
    throw new Error("Use at most 2 decimal places");
  }
  if (typeof raw.asset !== "string" || !raw.asset.trim()) throw new Error("Asset is required");
  if (typeof raw.to !== "string" || !raw.to.trim()) throw new Error("Recipient is required");
  const recipient = canonicalRecipient(raw.to);
  if (typeof raw.chain !== "string" || !raw.chain.trim()) throw new Error("Chain is required");
  const purpose = typeof raw.purpose === "string" ? raw.purpose.trim().slice(0, 140) : "";
  if (raw.idempotencyKey != null && typeof raw.idempotencyKey !== "string") {
    throw new Error("idempotencyKey must be a string");
  }
  const idempotencyKey =
    typeof raw.idempotencyKey === "string" && raw.idempotencyKey.trim()
      ? raw.idempotencyKey.trim().slice(0, 80)
      : null;
  return {
    request: {
      amountUsd: fromCents(cents(amountUsd)),
      asset: raw.asset.trim(),
      to: recipient,
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
      detail: `Available after holds is ${formatUsd(usage.balanceUsd)}. The wallet balance was not debited.`,
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
