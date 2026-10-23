import type { HumanPolicy, PaymentRequest } from "@/lib/policy";
import { USDC_TOKEN } from "@/lib/policy";

export type AttestationKind = "local-policy-gate" | "outlayer-dry-run";

export type Durability = "process-memory" | "local-db" | "local-db-ephemeral";

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
   * local-db = file-backed PGLite (survives local restart).
   * local-db-ephemeral = in-memory PGLite (warm isolate only; Vercel cold start forgets).
   * process-memory = persist skipped (MANDATE_DURABILITY=process-memory).
   * Still not a TEE and not multi-instance durable without shared Postgres/OutLayer.
   */
  durability: Durability;
  liveKey: boolean;
};
