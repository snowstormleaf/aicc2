import type { CustomerPersona, PersonaSource } from "./models";

function nowIso() {
  return new Date().toISOString();
}

export function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizePersona(p: CustomerPersona, fallbackSource: PersonaSource = "manual"): CustomerPersona {
  const createdAt = p.meta?.createdAt ?? nowIso();
  const updatedAt = nowIso();
  const source = p.meta?.source ?? fallbackSource;

  return {
    ...p,
    name: String(p.name ?? "").trim() || "Untitled Persona",
    id: String(p.id ?? "").trim() || `persona_${Math.random().toString(16).slice(2)}`,
    demographics: {
      age: String(p.demographics?.age ?? "").trim() || "Unknown",
      income: String(p.demographics?.income ?? "").trim() || "Unknown",
      family: String(p.demographics?.family ?? "").trim() || "Unknown",
      location: String(p.demographics?.location ?? "").trim() || "Unknown",
    },
    attributes: (p.attributes ?? {}) as Record<string, string>,
    motivations: ensureStringArray(p.motivations),
    painPoints: ensureStringArray(p.painPoints),
    buyingBehavior: ensureStringArray(p.buyingBehavior),

    summary: p.summary?.trim() || undefined,
    traits: ensureStringArray(p.traits),
    tags: ensureStringArray(p.tags),

    goals: ensureStringArray(p.goals),
    jobsToBeDone: ensureStringArray(p.jobsToBeDone),
    decisionCriteria: ensureStringArray(p.decisionCriteria),
    objections: ensureStringArray(p.objections),
    channels: ensureStringArray(p.channels),
    preferredContent: ensureStringArray(p.preferredContent),

    meta: { source, createdAt, updatedAt },
  };
}
