/**
 * Durable store for the Mandate gate (policy + ledger + holds).
 * Uses embedded PGLite (file-backed when possible). Label: durability "local-db".
 * Not a TEE. Not multi-instance consensus. Set MANDATE_DURABILITY=process-memory to skip.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import type { PGlite } from "@electric-sql/pglite";

import type { GateReceipt } from "@/lib/gate-types";
import type { HumanPolicy, PaymentRequest } from "@/lib/policy";

export type DurabilityMode = "process-memory" | "local-db";

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

export function durabilityMode(): DurabilityMode {
  const raw = (process.env.MANDATE_DURABILITY ?? "local-db").trim().toLowerCase();
  if (raw === "process-memory" || raw === "memory" || raw === "off") return "process-memory";
  return "local-db";
}

function dataDir(): string | undefined {
  const custom = process.env.MANDATE_PGDATA?.trim();
  if (custom) return resolve(custom);
  // node:test / CI: keep in-memory so suites do not share a dirty file.
  if (process.env.MANDATE_PGDATA_MEMORY === "1") return undefined;
  if (process.env.NODE_TEST === "1") return undefined;
  // Writable local /tmp-friendly path. On Vercel this is ephemeral per instance —
  // still "local-db", not TEE, and not durable across cold starts without Neon.
  const root = process.env.VERCEL ? "/tmp/mandate-gate" : resolve(".data/mandate-gate");
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
    const pg = dir ? new PGlite(dir) : new PGlite();
    await pg.waitReady;
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
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  if (durabilityMode() === "process-memory") return;
  const pg = await openDb();
  await pg.query(
    `insert into mandate_gate (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [ROW_ID, JSON.stringify(state)],
  );
}

export async function clearPersistedState(): Promise<void> {
  if (durabilityMode() === "process-memory") return;
  const pg = await openDb();
  await pg.exec("delete from mandate_gate");
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
