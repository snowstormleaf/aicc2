import * as React from "react";
import { personas as seedPersonaProfiles } from "@/data/personas";
import type { CustomerPersona, PersonaSource } from "./types";

type PersonasContextValue = {
  personas: CustomerPersona[];
  personasById: Record<string, CustomerPersona>;
  seedIds: Set<string>;

  upsertPersona: (persona: CustomerPersona) => void;
  deletePersona: (id: string) => void;
  resetPersonaToSeed: (id: string) => void;

  getPersonaName: (id: string) => string;
};

const PersonasContext = React.createContext<PersonasContextValue | null>(null);

const STORAGE_KEY = "aicc2_personas_v1";

type Persisted = {
  version: 1;
  personas: CustomerPersona[];
};

function nowIso() {
  return new Date().toISOString();
}

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadPersisted(): Persisted | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse<Persisted>(raw);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.personas)) return null;
  return parsed;
}

function savePersisted(data: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const seedEnrichment: Record<
  string,
  Pick<CustomerPersona, "summary" | "traits" | "tags">
> = {
  "fleet-manager": {
    summary:
      "Corporate fleet decision-maker focused on total cost of ownership and operational efficiency.",
    traits: ["Cost-conscious", "Data-driven", "Long-term thinking", "Risk-averse"],
    tags: ["B2B", "Fleet", "TCO"],
  },
  "small-business-owner": {
    summary:
      "Entrepreneur seeking reliable, versatile vehicles that support business growth.",
    traits: ["Value-focused", "Practical", "Growth-oriented", "Multi-functional needs"],
    tags: ["SMB", "Owner", "Versatility"],
  },
  "individual-buyer": {
    summary:
      "Personal vehicle purchaser prioritizing comfort, style, and personal utility.",
    traits: ["Emotion-driven", "Style-conscious", "Comfort-focused", "Tech-aware"],
    tags: ["B2C", "Lifestyle", "Comfort"],
  },
};

function normalizePersona(p: CustomerPersona, fallbackSource: PersonaSource = "manual"): CustomerPersona {
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

function buildSeedPersonas(): Record<string, CustomerPersona> {
  const out: Record<string, CustomerPersona> = {};
  Object.values(seedPersonaProfiles).forEach((profile) => {
    const extra = seedEnrichment[profile.id] ?? {};
    out[profile.id] = normalizePersona(
      {
        ...profile,
        ...extra,
        meta: { source: "seed", createdAt: "seed", updatedAt: "seed" },
      },
      "seed"
    );
  });
  return out;
}

export function PersonasProvider({ children }: { children: React.ReactNode }) {
  const seedById = React.useMemo(() => buildSeedPersonas(), []);
  const seedIds = React.useMemo(() => new Set(Object.keys(seedById)), [seedById]);

  const [customById, setCustomById] = React.useState<Record<string, CustomerPersona>>(() => {
    const persisted = loadPersisted();
    if (!persisted) return {};
    const map: Record<string, CustomerPersona> = {};
    for (const p of persisted.personas) {
      const normalized = normalizePersona(p, p.meta?.source ?? "manual");
      map[normalized.id] = normalized;
    }
    return map;
  });

  React.useEffect(() => {
    const payload: Persisted = {
      version: 1,
      personas: Object.values(customById),
    };
    savePersisted(payload);
  }, [customById]);

  const personasById = React.useMemo(() => {
    // custom overrides seed by ID
    return { ...seedById, ...customById };
  }, [seedById, customById]);

  const personas = React.useMemo(() => {
    return Object.values(personasById).sort((a, b) => a.name.localeCompare(b.name));
  }, [personasById]);

  const upsertPersona = React.useCallback((persona: CustomerPersona) => {
    const normalized = normalizePersona(persona, persona.meta?.source ?? "manual");
    setCustomById((prev) => ({ ...prev, [normalized.id]: normalized }));
  }, []);

  const deletePersona = React.useCallback((id: string) => {
    setCustomById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetPersonaToSeed = React.useCallback(
    (id: string) => {
      if (!seedIds.has(id)) return;
      deletePersona(id); // removes override, seed will “shine through”
    },
    [seedIds, deletePersona]
  );

  const getPersonaName = React.useCallback(
    (id: string) => personasById[id]?.name ?? id,
    [personasById]
  );

  const value = React.useMemo<PersonasContextValue>(
    () => ({
      personas,
      personasById,
      seedIds,
      upsertPersona,
      deletePersona,
      resetPersonaToSeed,
      getPersonaName,
    }),
    [personas, personasById, seedIds, upsertPersona, deletePersona, resetPersonaToSeed, getPersonaName]
  );

  return <PersonasContext.Provider value={value}>{children}</PersonasContext.Provider>;
}

export function usePersonas() {
  const ctx = React.useContext(PersonasContext);
  if (!ctx) throw new Error("usePersonas must be used within <PersonasProvider>");
  return ctx;
}