-- Mandate gate durable snapshot (policy, ledger, holds). Not a TEE.
-- Preview uses an embedded PGLite instance; Neon applies this file on deploy.
create table if not exists mandate_gate (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
