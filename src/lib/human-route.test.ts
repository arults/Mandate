import assert from "node:assert/strict";
import test from "node:test";

import { decideHumanAccess, refuseHumanRoute } from "./human-route.server.ts";

test("HTTP without token is always closed", () => {
  assert.equal(
    decideHumanAccess({ tokenEnv: undefined, humanHeader: null, secFetchSite: "same-origin", mode: "http" }),
    "deny_closed",
  );
  const res = refuseHumanRoute(new Request("http://local/api/v1/policy", { method: "POST" }));
  assert.equal(res?.status, 403);
});

test("HTTP with matching token allows", () => {
  process.env.MANDATE_HUMAN_TOKEN = "tok";
  try {
    assert.equal(
      decideHumanAccess({ tokenEnv: "tok", humanHeader: "tok", secFetchSite: null, mode: "http" }),
      "allow",
    );
    const ok = refuseHumanRoute(
      new Request("http://local/api/v1/fund", {
        method: "POST",
        headers: { "x-mandate-human": "tok" },
      }),
    );
    assert.equal(ok, null);
  } finally {
    delete process.env.MANDATE_HUMAN_TOKEN;
  }
});

test("timing-safe mismatch rejects wrong length tokens", () => {
  assert.equal(
    decideHumanAccess({ tokenEnv: "abcdef", humanHeader: "ab", secFetchSite: null, mode: "http" }),
    "deny_auth",
  );
});

test("Sec-Fetch-Site cannot bypass a configured human token on server-fn", () => {
  assert.equal(
    decideHumanAccess({
      tokenEnv: "tok",
      humanHeader: null,
      secFetchSite: "same-origin",
      mode: "server-fn",
    }),
    "deny_auth",
  );
  assert.equal(
    decideHumanAccess({
      tokenEnv: "tok",
      humanHeader: "tok",
      secFetchSite: null,
      mode: "server-fn",
    }),
    "allow",
  );
});
