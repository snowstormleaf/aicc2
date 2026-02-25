import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { utilityFromWtp, wtpFromUtility } from "../src/domain/analysis/wtp.ts";

describe("WTP utility conversion", () => {
  it("inverts log1p money utility back to dollars with expm1", () => {
    const beta = 0.2;
    const targetDollars = 316;
    const moneyScale = 100;
    const utility = beta * Math.log1p(targetDollars / moneyScale);
    const recovered = wtpFromUtility(utility, beta, "log1p", moneyScale);
    assert.ok(Math.abs(recovered - targetDollars) < 1e-6);
  });

  it("inverts linear money utility back to dollars", () => {
    const beta = 0.4;
    const utility = 80;
    const wtp = wtpFromUtility(utility, beta, "linear");
    assert.equal(wtp, 200);
    assert.equal(utilityFromWtp(wtp, beta, "linear"), utility);
  });
});
