import assert from "node:assert/strict";
import test from "node:test";

import { merchantOf } from "./merchants.ts";

test("travel merchants map to hotel, airline, and rides", () => {
  assert.equal(merchantOf("hotel.near"), "hotel");
  assert.equal(merchantOf("hote1.near"), "hotel");
  assert.equal(merchantOf("airline.near"), "airline");
  assert.equal(merchantOf("rides.near"), "rides");
  assert.equal(merchantOf("vendor.near"), null);
  assert.equal(merchantOf("attacker.near"), null);
});
