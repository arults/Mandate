/**
 * Durable store for the Mandate gate (policy + ledger + holds).
 * Uses embedded PGLite (file-backed when possible).
 * Labels: local-db (file), local-db-ephemeral (in-memory / Vercel), process-memory (off).
 * Not a TEE. Not multi-instance consensus. Set MANDATE_DURABILITY=process-memory to skip.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import type { PGlite } from "@electric-sql/pglite";

import type { GateReceipt } from "@/lib/gate-types";
import type { HumanPolicy, PaymentRequest } from "@/lib/policy";

export type DurabilityMode = "process-memory" | "local-db" | "local-db-ephemeral";

export type PersistedPending = {
  receipt: GateReceipt;
  request: PaymentRequest;
  reservedCents: number;
  idempotencyKey: string | null;
};

export type PersistedIdempotencyHit = { hash: string; receipt: GateReceipt };

export type PersistedState = {
  policy: HumanPolicy | null;
  day: string;
  spentCents: number;
  balanceCents: number;
  pending: PersistedPending[];
  ledger: GateReceipt[];
  idempotency: Array<[string, PersistedIdempotencyHit]>;
};

const ROW_ID = "default";

const globalRef = globalThis as typeof globalThis & {
  __mandateGatePg__?: Promise<PGlite>;
  __mandateGateHydrated__?: boolean;
};

/** True when PGLite cannot use a durable file dir (tests / Vercel / Lambda / explicit memory). */
export function isEphemeralPgData(): boolean {
  if (process.env.MANDATE_PGDATA?.trim()) return false;
  if (process.env.MANDATE_PGDATA_MEMORY === "1") return true;
  if (process.env.NODE_TEST === "1") return true;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  return false;
}

/**
 * Honesty label for snapshot/UI:
 * - process-memory: persist skipped entirely
 * - local-db: file-backed PGLite (survives local process restart)
 * - local-db-ephemeral: in-memory PGLite (same-isolate only; cold Vercel isolates forget)
 */
export function durabilityMode(): DurabilityMode {
  const raw = (process.env.MANDATE_DURABILITY ?? "local-db").trim().toLowerCase();
  if (raw === "process-memory" || raw === "memory" || raw === "off") return "process-memory";
  if (raw === "local-db-ephemeral" || raw === "ephemeral") return "local-db-ephemeral";
  if (isEphemeralPgData()) return "local-db-ephemeral";
  return "local-db";
}

function dataDir(): string | undefined {
  const custom = process.env.MANDATE_PGDATA?.trim();
  if (custom) return resolve(custom);
  // node:test / CI / serverless: in-memory PGLite. File-backed mode on Vercel
  // tried to open /var/task/_libs/pglite.data and broke /api/v1/pay.
  if (isEphemeralPgData()) return undefined;
  const root = resolve(".data/mandate-gate");
  try {
    mkdirSync(root, { recursive: true });
    return root;
  } catch {
    return undefined;
  }
}

async function openDb(): Promise<PGlite> {
  globalRef.__mandateGatePg__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = dataDir();
    let pg: PGlite;
    try {
      pg = dir ? new PGlite(dir) : new PGlite();
      await pg.waitReady;
    } catch (err) {
      // Last resort: plain in-memory if a custom data dir fails.
      if (dir) {
        console.error("[mandate-gate] file PGLite failed; falling back to memory", err);
        pg = new PGlite();
        await pg.waitReady;
      } else {
        throw err;
      }
    }
    await pg.exec(`
      create table if not exists mandate_gate (
        id text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      );
    `);
    return pg;
  })().catch((err) => {
    globalRef.__mandateGatePg__ = undefined;
    throw err;
  });
  return globalRef.__mandateGatePg__;
}

export function markGateUnhydrated() {
  globalRef.__mandateGateHydrated__ = false;
}

export function markGateHydrated() {
  globalRef.__mandateGateHydrated__ = true;
}

export function isGateHydrated(): boolean {
  return Boolean(globalRef.__mandateGateHydrated__);
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  if (durabilityMode() === "process-memory") return null;
  try {
    const pg = await openDb();
    const result = await pg.query<{ payload: PersistedState | string }>(
      "select payload from mandate_gate where id = $1",
      [ROW_ID],
    );
    const row = result.rows[0];
    if (!row) return null;
    const payload = typeof row.payload === "string" ? (JSON.parse(row.payload) as PersistedState) : row.payload;
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch (err) {
    console.error("[mandate-gate] load failed; continuing with blank memory", err);
    return null;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  if (durabilityMode() === "process-memory") return;
  try {
    const pg = await openDb();
    await pg.query(
      `insert into mandate_gate (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [ROW_ID, JSON.stringify(state)],
    );
  } catch (err) {
    console.error("[mandate-gate] save failed; gate continues in memory", err);
  }
}

export async function clearPersistedState(): Promise<void> {
  if (durabilityMode() === "process-memory") return;
  try {
    const pg = await openDb();
    await pg.exec("delete from mandate_gate");
  } catch (err) {
    console.error("[mandate-gate] clear failed", err);
  }
}

/** Test helper: drop the shared PGLite handle so the next open is fresh. */
export async function resetPersistForTests() {
  const pending = globalRef.__mandateGatePg__;
  globalRef.__mandateGatePg__ = undefined;
  globalRef.__mandateGateHydrated__ = false;
  if (pending) {
    try {
      const pg = await pending;
      await pg.close();
    } catch {
      // ignore close races
    }
  }
}
