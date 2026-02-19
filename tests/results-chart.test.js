import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAxisLayout, buildBarLayout, buildDifferenceData } from "../src/lib/results-chart.ts";

const makeRow = (overrides = {}) => ({
  featureId: "f-1",
  featureName: "Adaptive Cruise Control",
  materialCost: 500,
  perceivedValue: 900,
  netScore: 10,
  ...overrides,
});

describe("results chart utilities", () => {
  it("builds axis layout with bounded width and font scaling", () => {
    const short = buildAxisLayout(["A", "B"]);
    const long = buildAxisLayout(["Very Long Feature Name That Needs More Space"]);

    assert.ok(short.axisWidth >= 180);
    assert.ok(short.axisWidth <= 420);
    assert.ok(long.axisWidth >= short.axisWidth);
    assert.ok(long.fontSize <= short.fontSize);
  });

  it("builds bar layout to avoid overlap with multiple series", () => {
    const oneSeries = buildBarLayout({ rowCount: 10, seriesCount: 1, minHeight: 320 });
    const threeSeries = buildBarLayout({ rowCount: 10, seriesCount: 3, minHeight: 320 });

    assert.ok(oneSeries.chartHeight >= 320);
    assert.ok(threeSeries.chartHeight >= oneSeries.chartHeight);
    assert.ok(threeSeries.barSize <= oneSeries.barSize);
    assert.ok(threeSeries.barSize >= 8);
  });

  it("computes difference data by feature id", () => {
    const personaA = [makeRow({ featureId: "f-1", perceivedValue: 1000 })];
    const personaB = [makeRow({ featureId: "f-1", perceivedValue: 800 })];
    const rows = buildDifferenceData(personaA, personaB);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].difference, 200);
  });

  it("falls back to matching by normalized feature name", () => {
    const personaA = [makeRow({ featureId: "a-1", featureName: "Heated Seats", perceivedValue: 700 })];
    const personaB = [makeRow({ featureId: "b-9", featureName: "  heated seats  ", perceivedValue: 650 })];
    const rows = buildDifferenceData(personaA, personaB);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].feature, "Heated Seats");
    assert.equal(rows[0].difference, 50);
  });

  it("returns rows even when one side has unmatched features", () => {
    const personaA = [makeRow({ featureId: "f-a", featureName: "Sunroof", perceivedValue: 600 })];
    const personaB = [makeRow({ featureId: "f-b", featureName: "Tow Package", perceivedValue: 400 })];
    const rows = buildDifferenceData(personaA, personaB);

    assert.ok(rows.length >= 2);
    assert.ok(rows.some((row) => row.feature === "Sunroof"));
    assert.ok(rows.some((row) => row.feature === "Tow Package"));
  });

  it("sorts differences from highest positive to most negative", () => {
    const personaA = [
      makeRow({ featureId: "f-1", featureName: "Feature 1", perceivedValue: 1000 }),
      makeRow({ featureId: "f-2", featureName: "Feature 2", perceivedValue: 300 }),
      makeRow({ featureId: "f-3", featureName: "Feature 3", perceivedValue: 500 }),
    ];
    const personaB = [
      makeRow({ featureId: "f-1", featureName: "Feature 1", perceivedValue: 200 }),
      makeRow({ featureId: "f-2", featureName: "Feature 2", perceivedValue: 700 }),
      makeRow({ featureId: "f-3", featureName: "Feature 3", perceivedValue: 450 }),
    ];

    const rows = buildDifferenceData(personaA, personaB);
    const differences = rows.map((row) => row.difference);

    assert.deepEqual(differences, [800, 50, -400]);
    assert.deepEqual(rows.map((row) => row.feature), ["Feature 1", "Feature 3", "Feature 2"]);
  });
});
