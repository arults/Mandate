import assert from "node:assert/strict";
import test from "node:test";

import { MAX_JSON_BODY_BYTES, readJsonBody } from "./http-body.server.ts";

test("accepts a small JSON body", async () => {
  const req = new Request("http://local/api/v1/pay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amountUsd: 8 }),
  });
  const parsed = await readJsonBody(req);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal((parsed.value as { amountUsd: number }).amountUsd, 8);
});

test("rejects Content-Length over the cap with 413", async () => {
  const req = new Request("http://local/api/v1/pay", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(MAX_JSON_BODY_BYTES + 1) },
    body: "{}",
  });
  const parsed = await readJsonBody(req);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.response.status, 413);
});

test("rejects an oversized body even without Content-Length", async () => {
  const fat = "x".repeat(MAX_JSON_BODY_BYTES + 50);
  const req = new Request("http://local/api/v1/pay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: `{"purpose":"${fat}"}`,
  });
  const parsed = await readJsonBody(req);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.response.status, 413);
});

test("rejects invalid JSON with 400", async () => {
  const req = new Request("http://local/api/v1/pay", {
    method: "POST",
    body: "{not-json",
  });
  const parsed = await readJsonBody(req);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.response.status, 400);
});
