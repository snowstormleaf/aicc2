export type PersonaSource = "seed" | "manual" | "ai";

export interface CustomerPersona {
  id: string;
  name: string;
  summary?: string;
  traits?: string[];
  tags?: string[];
  brand?: string;
  attributes?: Record<string, string>;
  demographics: {
    age: string;
    income: string;
    family: string;
    location: string;
  };
  motivations?: string[];
  painPoints?: string[];
  buyingBehavior?: string[];
  goals?: string[];
  jobsToBeDone?: string[];
  decisionCriteria?: string[];
  objections?: string[];
  channels?: string[];
  preferredContent?: string[];
  meta?: {
    source?: PersonaSource;
    createdAt?: string;
    updatedAt?: string;
  };
}
