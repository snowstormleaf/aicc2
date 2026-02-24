import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MaxDiffEngine } from "../src/domain/analysis/engine.ts";
import {
  computeExposureTaskPlan,
  displayWtpFromRaw,
  evaluateStabilityGates,
} from "../src/domain/analysis/stability.ts";

describe("maxdiff stability planning", () => {
  it("computes minimum task target from feature and voucher exposure goals", () => {
    const plan = computeExposureTaskPlan({
      featureCount: 12,
      voucherLevelCount: 7,
      targetFeatureExposures: 12,
      targetVoucherExposuresPerLevel: 10,
      featuresPerTask: 3,
      minTasksFloor: 60,
    });

    assert.equal(plan.tasksForFeatures, 48);
    assert.equal(plan.tasksForVouchers, 70);
    assert.equal(plan.minTasks, 70);
    assert.ok(plan.minTasks >= 70);
  });

  it("flags stability gates as pending when minimum information is not met", () => {
    const featureAppearances = new Map([
      ["f1", 8],
      ["f2", 9],
      ["f3", 8],
    ]);
    const voucherAppearances = new Map([
      ["v1", 5],
      ["v2", 4],
    ]);

    const gates = evaluateStabilityGates({
      answeredTasks: 31,
      repeatTasksAnswered: 3,
      jointRepeatability: 0.66,
      failureRate: 0.05,
      featureAppearances,
      voucherAppearances,
      thresholds: {
        minTasksBeforeStability: 70,
        minFeatureAppearances: 12,
        minVoucherAppearances: 10,
        minRepeatTasks: 8,
        minRepeatability: 0.8,
        maxFailureRate: 0.02,
      },
    });

    assert.equal(gates.gatesMet, false);
    assert.equal(gates.canEvaluateStability, false);
    assert.ok(gates.reasons.length >= 4);
    assert.equal(gates.minTasksMet, false);
    assert.equal(gates.minFeatureExposureMet, false);
    assert.equal(gates.minVoucherExposureMet, false);
    assert.equal(gates.minRepeatsMet, false);
    assert.equal(gates.failureRateMet, false);
  });

  it("clamps negative WTP for display by default", () => {
    assert.equal(displayWtpFromRaw(-25, false), 0);
    assert.equal(displayWtpFromRaw(-25, true), -25);
    assert.equal(displayWtpFromRaw(50, false), 50);
  });

  it("builds unique sorted voucher levels including $0", () => {
    const levels = MaxDiffEngine.buildVoucherGrid(
      {
        min_discount: 0,
        max_discount: 1000,
        levels: 7,
        spacing: "log",
        include_zero: true,
      },
      { spacing: "log", includeZero: true }
    );

    assert.equal(levels[0], 0);
    assert.equal(levels.length, 7);
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
    assert.equal(new Set(levels).size, levels.length);
  });
});
