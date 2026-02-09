/**
 * @typedef {import("@/personas/types").CustomerPersona} CustomerPersona
 * @typedef {import("@/types/vehicle").Vehicle} Vehicle
 */

/**
 * @param {CustomerPersona | null | undefined} initial
 */
export const buildPersonaFormDefaults = (initial) => ({
  name: initial?.name ?? "",
  summary: initial?.summary ?? "",
  brand: initial?.brand ?? "",
  role: initial?.attributes?.role ?? "",
  companySize: initial?.attributes?.company_size ?? "",
  responsibility: initial?.attributes?.responsibility ?? "",
  decisionAuthority: initial?.attributes?.decision_authority ?? "",
  age: initial?.demographics?.age ?? "",
  income: initial?.demographics?.income ?? "",
  family: initial?.demographics?.family ?? "",
  location: initial?.demographics?.location ?? "",
  traits: (initial?.traits ?? []).join("\n"),
  tags: (initial?.tags ?? []).join("\n"),
  motivations: (initial?.motivations ?? []).join("\n"),
  painPoints: (initial?.painPoints ?? []).join("\n"),
  buyingBehavior: (initial?.buyingBehavior ?? []).join("\n"),
  goals: (initial?.goals ?? []).join("\n"),
  jobsToBeDone: (initial?.jobsToBeDone ?? []).join("\n"),
  decisionCriteria: (initial?.decisionCriteria ?? []).join("\n"),
  objections: (initial?.objections ?? []).join("\n"),
  channels: (initial?.channels ?? []).join("\n"),
  preferredContent: (initial?.preferredContent ?? []).join("\n"),
});

/**
 * @param {Vehicle | null | undefined} initial
 */
export const buildVehicleFormDefaults = (initial) => ({
  name: initial?.name ?? "",
  manufacturer: initial?.manufacturer ?? "",
  model: initial?.model ?? "",
  year: initial?.year ? String(initial.year) : "",
  description: initial?.description ?? "",
  tags: (initial?.tags ?? []).join("\n"),
});
