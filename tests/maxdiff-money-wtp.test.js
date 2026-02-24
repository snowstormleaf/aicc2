import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MaxDiffEngine } from "../src/domain/analysis/engine.ts";

const features = [
  { id: "f1", name: "Feature 1", materialCost: 100 },
  { id: "f2", name: "Feature 2", materialCost: 120 },
  { id: "f3", name: "Feature 3", materialCost: 140 },
];

const vouchers = [
  { id: "v1", amount: 50, description: "$50" },
  { id: "v2", amount: 316, description: "$316" },
  { id: "v3", amount: 1068, description: "$1068" },
];

describe("maxdiff money WTP outputs", () => {
  it("applies moneyScale when converting model units back to currency", () => {
    const beta = -1;
    const utility = beta * Math.log1p(316 / 100);
    const modelUnits = Math.expm1(utility / beta);
    const currency = 100 * modelUnits;
    assert.ok(Math.abs(currency - 316) < 1e-9);
  });

  it("does not force a baseline feature utility and CI to exact zero", () => {
    const responses = [
      { setId: "s1", personaId: "p1", mostValued: "f1", leastValued: "f2", ranking: ["f1", "f3", "f2", "v1"] },
      { setId: "s2", personaId: "p1", mostValued: "f2", leastValued: "f3", ranking: ["f2", "f1", "v2", "f3"] },
      { setId: "s3", personaId: "p1", mostValued: "f3", leastValued: "f1", ranking: ["f3", "v3", "f2", "f1"] },
    ];

    const result = MaxDiffEngine.computePerceivedValues(responses, features, vouchers);
    const forcedZeroRows = result.filter(
      (row) => row.utility === 0 && row.utilityCiLow === 0 && row.utilityCiHigh === 0
    );

    assert.equal(forcedZeroRows.length, 0);
  });

  it("clamps negative display WTP to zero while keeping raw negatives", () => {
    const responses = [
      { setId: "s1", personaId: "p1", mostValued: "f2", leastValued: "f1", ranking: ["f2", "f3", "v1", "f1"] },
      { setId: "s2", personaId: "p1", mostValued: "f3", leastValued: "f1", ranking: ["f3", "v2", "f2", "f1"] },
    ];

    const result = MaxDiffEngine.computePerceivedValues(responses, features, vouchers, {
      transform: "log1p",
      moneyScale: 100,
      clampNegativeDisplay: true,
    });

    const negativeRow = result.find((row) => row.rawModelWtpCurrency < 0);
    assert.ok(negativeRow);
    assert.equal(negativeRow.perceivedValue, 0);
  });
});
