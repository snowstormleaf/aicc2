import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateNearBIBDDesign, extendNearBIBDDesign } from "../src/domain/analysis/design/maxdiffDesign.ts";
import { MaxDiffEngine } from "../src/domain/analysis/engine.ts";

const makeFeatures = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `feature-${index + 1}`,
    name: `Feature ${index + 1}`,
    description: `Description ${index + 1}`,
    materialCost: 100 + index * 10,
  }));

const makeVouchers = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `voucher-${index + 1}`,
    amount: 25 * (index + 1),
    description: `$${25 * (index + 1)} off`,
  }));

describe("near-BIBD MaxDiff design", () => {
  it("keeps item appearances balanced and deterministic for same seed", () => {
    const items = [
      ...makeFeatures(10).map((f) => f.id),
      ...makeVouchers(4).map((v) => v.id),
    ];
    const one = generateNearBIBDDesign(items, 4, 8, 12345);
    const two = generateNearBIBDDesign(items, 4, 8, 12345);

    assert.deepEqual(one.blocks, two.blocks);
    assert.ok(one.diagnostics.itemCountImbalance <= 1);
    assert.ok(one.diagnostics.itemSummary.cv <= 0.08);
  });

  it("improves pair-balance objective compared with legacy generator", () => {
    const features = makeFeatures(10);
    const vouchers = makeVouchers(4);
    const items = [...features.map((f) => f.id), ...vouchers.map((v) => v.id)];
    const rTarget = 8;

    const near = generateNearBIBDDesign(items, 4, rTarget, 77);
    const legacySets = MaxDiffEngine.generateMaxDiffSets(features, vouchers, rTarget, 4);
    const legacyDiagnostics = extendNearBIBDDesign(
      items,
      4,
      legacySets.map((set) => ({
        id: set.id,
        itemIds: set.options.map((option) => option.id),
      })),
      0,
      77
    ).diagnostics;

    assert.ok(near.diagnostics.pairCountImbalance <= legacyDiagnostics.pairCountImbalance);
    assert.ok(near.diagnostics.pairSquaredDeviation <= legacyDiagnostics.pairSquaredDeviation);
    assert.ok(near.diagnostics.pairSummary.coverage >= legacyDiagnostics.pairSummary.coverage);
  });
});

