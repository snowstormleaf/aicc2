import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runFeatureCashCalibrationSearch } from "../src/domain/analysis/calibration/featureCashCalibration.ts";

describe("feature↔cash calibration search", () => {
  it("converges near oracle indifference value", async () => {
    const trueWtp = 140;
    const result = await runFeatureCashCalibrationSearch(
      async (amount) => (amount < trueWtp ? "A" : "B"),
      {
        initialGuess: 60,
        minX: 10,
        maxX: 400,
        steps: 8,
      }
    );

    assert.ok(result.bracketStraddled);
    assert.ok(result.stepsUsed >= 5);
    assert.ok(result.calibrationLower <= trueWtp);
    assert.ok(result.calibrationUpper >= trueWtp);
    assert.ok(Math.abs(result.calibrationMid - trueWtp) <= 25);
  });
});

