import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyValueRatio, formatRatio, getValueRatio } from "../src/lib/value-metrics.ts";

describe("value metrics", () => {
  it("returns null ratio for invalid or zero baseline costs", () => {
    assert.equal(getValueRatio(100, 0), null);
    assert.equal(getValueRatio(100, -20), null);
    assert.equal(getValueRatio(Number.NaN, 100), null);
    assert.equal(getValueRatio(100, Number.POSITIVE_INFINITY), null);
  });

  it("formats and classifies valid ratios", () => {
    const ratio = getValueRatio(150, 100);
    assert.equal(ratio, 1.5);
    assert.equal(formatRatio(ratio), "1.50x");
    assert.equal(classifyValueRatio(ratio), "High Value");
  });

  it("formats and classifies missing ratios safely", () => {
    assert.equal(formatRatio(null), "N/A");
    assert.equal(classifyValueRatio(null), "No Baseline");
  });
});
