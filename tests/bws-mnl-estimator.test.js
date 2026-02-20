import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitBwsMnlMoney } from "../src/domain/analysis/estimation/bwsMnl.ts";
import { generateNearBIBDDesign } from "../src/domain/analysis/design/maxdiffDesign.ts";

const createMulberry32 = (seed) => {
  let t = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const weightedPick = (weights, rng) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  const draw = rng() * total;
  let running = 0;
  for (let i = 0; i < weights.length; i++) {
    running += weights[i];
    if (draw <= running) return i;
  }
  return weights.length - 1;
};

describe("BWS MNL estimator", () => {
  it("recovers utility ordering and positive beta on synthetic data", () => {
    const features = [
      { id: "f1", name: "Baseline", description: "Base", materialCost: 100 },
      { id: "f2", name: "Strong", description: "High value", materialCost: 180 },
      { id: "f3", name: "Medium", description: "Medium value", materialCost: 150 },
      { id: "f4", name: "Weak", description: "Low value", materialCost: 120 },
    ];
    const vouchers = [
      { id: "v1", amount: 20, description: "$20 off" },
      { id: "v2", amount: 80, description: "$80 off" },
      { id: "v3", amount: 220, description: "$220 off" },
    ];
    const trueUtility = {
      f1: 0,
      f2: 0.95,
      f3: 0.4,
      f4: -0.3,
    };
    const betaTrue = 0.22;
    const utilityForItem = (id) => {
      if (id in trueUtility) return trueUtility[id];
      const voucher = vouchers.find((item) => item.id === id);
      return betaTrue * Math.log1p(voucher?.amount ?? 0);
    };

    const items = [...features.map((f) => f.id), ...vouchers.map((v) => v.id)];
    const design = generateNearBIBDDesign(items, 4, 10, 919);
    const sets = design.blocks.map((block) => ({
      id: block.id,
      options: block.itemIds.map((id) => ({ id, name: id })),
    }));

    const rng = createMulberry32(2026);
    const responses = sets.map((set) => {
      const ids = set.options.map((option) => option.id);
      const utils = ids.map((id) => utilityForItem(id));
      const bestWeights = utils.map((u) => Math.exp(u));
      const bestIdx = weightedPick(bestWeights, rng);
      const bestId = ids[bestIdx];

      const remainingIds = ids.filter((_, idx) => idx !== bestIdx);
      const remainingUtils = remainingIds.map((id) => utilityForItem(id));
      const worstWeights = remainingUtils.map((u) => Math.exp(-u));
      const worstIdx = weightedPick(worstWeights, rng);
      const worstId = remainingIds[worstIdx];

      return {
        setId: set.id,
        personaId: "p1",
        mostValued: bestId,
        leastValued: worstId,
        ranking: [bestId, worstId],
      };
    });

    const fit = fitBwsMnlMoney(sets, responses, features, vouchers, {
      transform: "log1p",
      maxIters: 420,
      learningRate: 0.03,
      tolerance: 1e-6,
      seed: 999,
    });

    assert.equal(fit.taskCount, sets.length);
    assert.ok(fit.beta > 0);
    assert.ok(fit.rawWtpByFeature.f2 > fit.rawWtpByFeature.f3);
    assert.ok(fit.rawWtpByFeature.f3 > fit.rawWtpByFeature.f1);
    assert.ok(fit.rawWtpByFeature.f1 > fit.rawWtpByFeature.f4);

    const estimatedOrdering = ["f2", "f3", "f1", "f4"];
    const sortedByEstimated = Object.entries(fit.utilityByFeature)
      .sort((left, right) => right[1] - left[1])
      .map(([id]) => id);
    assert.deepEqual(sortedByEstimated.slice(0, 4), estimatedOrdering);
  });
});

