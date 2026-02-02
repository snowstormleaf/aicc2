import type { PersonaProfile } from "@/lib/llm-client";

export type PersonaSource = "seed" | "manual" | "ai";

export type CustomerPersona = PersonaProfile & {
  summary?: string;
  traits?: string[];
  tags?: string[];

  // Optional “marketing persona” fields (not required by MaxDiff, but shown in UI)
  goals?: string[];
  jobsToBeDone?: string[];
  decisionCriteria?: string[];
  objections?: string[];
  channels?: string[];
  preferredContent?: string[];

  meta?: {
    source: PersonaSource;
    createdAt: string; // ISO
    updatedAt: string; // ISO
  };
};