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

export interface MaxDiffMethodSummary {
  personaId: string;
  personaName: string;
  plannedTasks: number;
  answeredTasks: number;
  usedInFitTasks: number;
  stopReason: string;
  moneyScale: number;
  voucherLevelCounts: string;
}
