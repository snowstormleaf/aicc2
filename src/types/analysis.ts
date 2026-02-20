import type { PerceivedValue, PersonaAnalysisSummary } from "@/domain/analysis/engine";

export interface MaxDiffCallLog {
  id: string;
  timestamp: string;
  personaId?: string;
  personaName?: string;
  setId?: string;
  displayedFeatures: string[];
  mostValued: string;
  leastValued: string;
  status?: 'pending' | 'success' | 'error';
  request?: string;
  response?: string;
  error?: string;
}

export interface PersonaAnalysisResult {
  perceivedValues: PerceivedValue[];
  summary: PersonaAnalysisSummary;
}
