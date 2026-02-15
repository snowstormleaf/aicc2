import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOptimalSets } from "../src/lib/design-parameters.ts";
import { MaxDiffEngine } from "../src/domain/analysis/engine.ts";

const makeFeatures = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `feature-${index + 1}`,
    name: `Feature ${index + 1}`,
    description: `Description ${index + 1}`,
    materialCost: 100 + index,
  }));

describe("analysis set planning", () => {
  it("uses generated set count instead of legacy estimate when vouchers are included", () => {
    const features = makeFeatures(10);
    const oldEstimate = calculateOptimalSets(features.length).sets;
    const vouchers = MaxDiffEngine.generateVouchers(
      features.map((feature) => feature.materialCost),
      { min_discount: 10, max_discount: 200, levels: 6 }
    );
    const appearanceTarget = Math.max(3, Math.min(5, Math.ceil(features.length / 5)));
    const generatedSets = MaxDiffEngine.generateMaxDiffSets(features, vouchers, appearanceTarget);

    assert.equal(oldEstimate, 8);
    assert.equal(generatedSets.length, 12);
    assert.notEqual(generatedSets.length, oldEstimate);
  });

  it("calculates total API calls from generated sets", () => {
    const features = makeFeatures(8);
    const vouchers = MaxDiffEngine.generateVouchers(
      features.map((feature) => feature.materialCost),
      { min_discount: 10, max_discount: 200, levels: 6 }
    );
    const appearanceTarget = Math.max(3, Math.min(5, Math.ceil(features.length / 5)));
    const generatedSets = MaxDiffEngine.generateMaxDiffSets(features, vouchers, appearanceTarget);
    const personaCount = 3;

    const totalCalls = personaCount * generatedSets.length;
    assert.equal(totalCalls, 33);
  });
});
