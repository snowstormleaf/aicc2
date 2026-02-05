import * as React from "react";
import { personas as seedPersonaProfiles } from "@/data/personas";
import type { CustomerPersona } from "./types";
import { normalizePersona } from "@/domain/personas/usecases";
import { usePersonasStore } from "@/application/personas/store";

// Create seed enrichment
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

/**
 * PersonasProvider - Compatibility wrapper around Zustand store.
 * Initializes the store with seed personas and loads from DB on mount.
 */
export function PersonasProvider({ children }: { children: React.ReactNode }) {
  const seedPersonas = React.useMemo(() => buildSeedPersonas(), []);
  const initializePersonas = usePersonasStore((s) => s.initializePersonas);
  const loadPersonas = usePersonasStore((s) => s.loadPersonas);

  // Initialize with seed personas on first mount
  React.useEffect(() => {
    initializePersonas(seedPersonas);
  }, [seedPersonas, initializePersonas]);

  // Load personas from DB on mount
  React.useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  return <>{children}</>;
}

/**
 * usePersonas - Direct hook to Zustand store.
 * Provides personas state and actions.
 */
export function usePersonas() {
  return usePersonasStore();
}
