import type { HumanPolicy, PaymentRequest } from "@/lib/policy";
import { USDC_TOKEN } from "@/lib/policy";

export type AttestationKind = "local-policy-gate" | "outlayer-dry-run";

export type Durability = "process-memory" | "local-db";

export type SettlementQuote = {
  status: "ok" | "unavailable" | "skipped";
  correlationId: string | null;
  amountOut: string | null;
  amountOutFormatted: string | null;
  amountOutUsd: string | null;
  destinationAsset: string | null;
  note: string;
};

export type Settlement = {
  protocol: "near-intents-1click";
  submitted: false;
  sourceChain: "near";
  destinationChain: string;
  asset: "USDC";
  token: typeof USDC_TOKEN;
  amountUnits: string;
  recipient: string;
  calls: string[];
  live: { httpStatus: number; note: string } | null;
  /** Read-only 1-Click dry quote. Never implies broadcast. */
  quote: SettlementQuote | null;
};

export type GateReceipt = {
  id: string;
  at: string;
  request: PaymentRequest;
  status: "allow" | "reject" | "needs_approval" | "cancelled";
  rule: string | null;
  detail: string;
  remainingDailyUsd: number;
  spentUsd: number;
  balanceUsd: number;
  ignoredFields: string[];
  attestation: {
    kind: AttestationKind;
    statement: string;
    policyFingerprint: string;
  };
  settlement: Settlement | null;
};

export type Snapshot = {
  policy: HumanPolicy | null;
  fingerprint: string | null;
  spentUsd: number;
  remainingDailyUsd: number | null;
  balanceUsd: number;
  pending: GateReceipt[];
  ledger: GateReceipt[];
  enforcement: "local-policy-gate";
  /**
   * local-db = policy+ledger written through embedded PGLite (or file data dir).
   * Still not a TEE and not multi-instance durable without a shared Postgres/OutLayer.
   * process-memory = in-process only (MANDATE_DURABILITY=process-memory).
   */
  durability: Durability;
  liveKey: boolean;
};
