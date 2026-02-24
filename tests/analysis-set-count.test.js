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
    assert.equal(generatedSets.length, 10);
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
    assert.equal(totalCalls, 24);
  });

  it("applies voucher policy bounds and geometric spacing", () => {
    const features = makeFeatures(10);
    const vouchers = MaxDiffEngine.generateVouchers(
      features.map((feature) => feature.materialCost),
      { min_discount: 10, max_discount: 200, levels: 6 }
    );

    assert.equal(vouchers.length, 6);
    assert.equal(vouchers[0].amount, 0);
    assert.equal(vouchers[vouchers.length - 1].amount, 200);
    assert.deepEqual(
      vouchers.map((voucher) => voucher.amount),
      [...vouchers.map((voucher) => voucher.amount)].sort((a, b) => a - b)
    );
    assert.equal(new Set(vouchers.map((voucher) => voucher.amount)).size, vouchers.length);
  });

  it("defaults to 7 voucher levels including $0", () => {
    const features = makeFeatures(12);
    const bounds = MaxDiffEngine.deriveVoucherBounds(features.map((feature) => feature.materialCost));
    const vouchers = MaxDiffEngine.generateVouchers(features.map((feature) => feature.materialCost), bounds);

    assert.equal(bounds.levels, 7);
    assert.equal(vouchers.length, 7);
    assert.equal(vouchers[0].amount, 0);
  });

  it("enforces 3 features plus 1 voucher per task when vouchers are enabled", () => {
    const features = makeFeatures(12);
    const vouchers = MaxDiffEngine.generateVouchers(features.map((feature) => feature.materialCost), {
      min_discount: 0,
      max_discount: 1000,
      levels: 7,
    });
    const sets = MaxDiffEngine.generateMaxDiffPlan(features, vouchers, {
      r: 8,
      itemsPerSet: 4,
      designMode: "near_bibd",
      seed: 42,
      repeatFraction: 0.1,
    }).maxDiffSets;
    const voucherIds = new Set(vouchers.map((voucher) => voucher.id));
    const featureIds = new Set(features.map((feature) => feature.id));

    sets.forEach((set) => {
      const voucherCount = set.options.filter((option) => voucherIds.has(option.id)).length;
      const featureCount = set.options.filter((option) => featureIds.has(option.id)).length;
      assert.equal(voucherCount, 1);
      assert.equal(featureCount, 3);
      assert.equal(set.options.length, 4);
    });
  });
});
