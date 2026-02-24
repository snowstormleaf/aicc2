import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayWtpFromRaw } from "../src/domain/analysis/stability.ts";

describe("display WTP defaults", () => {
  it("clamps negative raw WTP to zero when negatives are hidden", () => {
    assert.equal(displayWtpFromRaw(-42.7, false), 0);
    assert.equal(displayWtpFromRaw(-42.7, true), -42.7);
  });
});
