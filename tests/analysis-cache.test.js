import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisCacheKey } from "../src/lib/analysis-cache.ts";

const baseParams = {
  vehicleId: "vehicle-a",
  personaId: "persona-a",
  model: "gpt-5-mini",
  serviceTier: "standard",
  features: [
    { id: "f1", name: "Adaptive Cruise", description: "Keeps distance", materialCost: 450 },
    { id: "f2", name: "Heated Seats", description: "Cabin comfort", materialCost: 320 },
  ],
};

describe("analysis cache keys", () => {
  it("is stable for equivalent inputs even when feature order changes", () => {
    const keyA = buildAnalysisCacheKey(baseParams);
    const keyB = buildAnalysisCacheKey({
      ...baseParams,
      features: [...baseParams.features].reverse(),
    });
    assert.equal(keyA, keyB);
  });

  it("changes when model, tier, vehicle, persona, or feature payload changes", () => {
    const base = buildAnalysisCacheKey(baseParams);

    assert.notEqual(
      base,
      buildAnalysisCacheKey({ ...baseParams, model: "gpt-5" })
    );
    assert.notEqual(
      base,
      buildAnalysisCacheKey({ ...baseParams, serviceTier: "flex" })
    );
    assert.notEqual(
      base,
      buildAnalysisCacheKey({ ...baseParams, vehicleId: "vehicle-b" })
    );
    assert.notEqual(
      base,
      buildAnalysisCacheKey({ ...baseParams, personaId: "persona-b" })
    );
    assert.notEqual(
      base,
      buildAnalysisCacheKey({
        ...baseParams,
        features: [
          ...baseParams.features,
          { id: "f3", name: "Sunroof", description: "Panoramic roof", materialCost: 900 },
        ],
      })
    );
  });
});
