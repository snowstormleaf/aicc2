import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPersonaFormDefaults, buildVehicleFormDefaults } from "../src/lib/form-defaults.js";

describe("form defaults", () => {
  it("prefills persona edit fields from initial data", () => {
    const defaults = buildPersonaFormDefaults({
      id: "persona-1",
      name: "Fleet Manager",
      brand: "McLaren",
      summary: "Summary",
      traits: ["Trait A"],
      tags: ["Tag A"],
      attributes: {
        role: "Role",
        company_size: "50-200",
        responsibility: "Ops",
        decision_authority: "High",
      },
      demographics: {
        age: "30-40",
        income: "$100k",
        family: "Family",
        location: "Berlin",
      },
      motivations: ["Motivation"],
      painPoints: ["Pain"],
      buyingBehavior: ["Behavior"],
      goals: ["Goal"],
      jobsToBeDone: ["Job"],
      decisionCriteria: ["Criteria"],
      objections: ["Objection"],
      channels: ["Channel"],
      preferredContent: ["Content"],
      meta: { source: "manual", createdAt: "now", updatedAt: "now" },
    });

    assert.equal(defaults.name, "Fleet Manager");
    assert.equal(defaults.brand, "McLaren");
    assert.equal(defaults.role, "Role");
    assert.equal(defaults.companySize, "50-200");
    assert.equal(defaults.age, "30-40");
    assert.equal(defaults.traits, "Trait A");
  });

  it("prefills vehicle edit fields from initial data", () => {
    const defaults = buildVehicleFormDefaults({
      id: "vehicle-1",
      name: "Transit",
      brand: "Ford",
      manufacturer: "Ford",
      model: "Custom",
      year: 2024,
      description: "Desc",
      tags: ["Tag A"],
      createdAt: "now",
      updatedAt: "now",
    });

    assert.equal(defaults.name, "Transit");
    assert.equal(defaults.brand, "Ford");
    assert.equal(defaults.manufacturer, "Ford");
    assert.equal(defaults.model, "Custom");
    assert.equal(defaults.year, "2024");
    assert.equal(defaults.tags, "Tag A");
  });

  it("falls back vehicle brand from manufacturer when brand is missing", () => {
    const defaults = buildVehicleFormDefaults({
      id: "vehicle-2",
      name: "Artura",
      manufacturer: "McLaren",
    });

    assert.equal(defaults.brand, "McLaren");
  });
});
