export const ANALYSIS_SETTINGS_STORAGE_KEY = 'analysis_settings';
export const ANALYSIS_SETTINGS_UPDATED_EVENT = 'analysis-settings-updated';

export interface AnalysisSettings {
  maxRetries: number;
  temperature: number;
  autoRecommendVouchers: boolean;
  persistResults: boolean;
  defaultUseCache: boolean;
  simulateApiCalls: boolean;
  showProgressUpdates: boolean;
  hideMaterialCost: boolean;
  designMode: "legacy" | "near_bibd";
  estimator: "legacy_score" | "bws_mnl_money";
  moneyTransform: "log1p" | "linear";
  designSeed: number;
  repeatTaskFraction: number;
  bootstrapSamples: number;
  stabilizeToTarget: boolean;
  stabilityTargetPercent: number;
  stabilityTopN: number;
  stabilityBatchSize: number;
  stabilityMaxTasks: number;
  enableCalibration: boolean;
  calibrationFeatureCount: number;
  calibrationSteps: number;
  calibrationStrategy: "global_scale" | "partial_override";
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  maxRetries: 3,
  temperature: 0,
  autoRecommendVouchers: true,
  persistResults: true,
  defaultUseCache: false,
  simulateApiCalls: false,
  showProgressUpdates: true,
  hideMaterialCost: false,
  designMode: "near_bibd",
  estimator: "bws_mnl_money",
  moneyTransform: "log1p",
  designSeed: 42,
  repeatTaskFraction: 0.1,
  bootstrapSamples: 200,
  stabilizeToTarget: false,
  stabilityTargetPercent: 5,
  stabilityTopN: 5,
  stabilityBatchSize: 10,
  stabilityMaxTasks: 80,
  enableCalibration: false,
  calibrationFeatureCount: 5,
  calibrationSteps: 7,
  calibrationStrategy: "partial_override",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeSettings = (candidate: Partial<AnalysisSettings>): AnalysisSettings => ({
  maxRetries: clamp(Math.round(candidate.maxRetries ?? DEFAULT_ANALYSIS_SETTINGS.maxRetries), 1, 5),
  temperature: clamp(Number(candidate.temperature ?? DEFAULT_ANALYSIS_SETTINGS.temperature), 0, 1),
  autoRecommendVouchers:
    candidate.autoRecommendVouchers ?? DEFAULT_ANALYSIS_SETTINGS.autoRecommendVouchers,
  persistResults: candidate.persistResults ?? DEFAULT_ANALYSIS_SETTINGS.persistResults,
  defaultUseCache: candidate.defaultUseCache ?? DEFAULT_ANALYSIS_SETTINGS.defaultUseCache,
  simulateApiCalls: candidate.simulateApiCalls ?? DEFAULT_ANALYSIS_SETTINGS.simulateApiCalls,
  showProgressUpdates: candidate.showProgressUpdates ?? DEFAULT_ANALYSIS_SETTINGS.showProgressUpdates,
  hideMaterialCost: candidate.hideMaterialCost ?? DEFAULT_ANALYSIS_SETTINGS.hideMaterialCost,
  designMode:
    candidate.designMode === "legacy" || candidate.designMode === "near_bibd"
      ? candidate.designMode
      : DEFAULT_ANALYSIS_SETTINGS.designMode,
  estimator:
    candidate.estimator === "legacy_score" || candidate.estimator === "bws_mnl_money"
      ? candidate.estimator
      : DEFAULT_ANALYSIS_SETTINGS.estimator,
  moneyTransform:
    candidate.moneyTransform === "linear" || candidate.moneyTransform === "log1p"
      ? candidate.moneyTransform
      : DEFAULT_ANALYSIS_SETTINGS.moneyTransform,
  designSeed: clamp(Math.round(candidate.designSeed ?? DEFAULT_ANALYSIS_SETTINGS.designSeed), 1, 2_000_000_000),
  repeatTaskFraction: clamp(Number(candidate.repeatTaskFraction ?? DEFAULT_ANALYSIS_SETTINGS.repeatTaskFraction), 0, 0.4),
  bootstrapSamples: clamp(Math.round(candidate.bootstrapSamples ?? DEFAULT_ANALYSIS_SETTINGS.bootstrapSamples), 20, 1000),
  stabilizeToTarget: candidate.stabilizeToTarget ?? DEFAULT_ANALYSIS_SETTINGS.stabilizeToTarget,
  stabilityTargetPercent: clamp(
    Number(candidate.stabilityTargetPercent ?? DEFAULT_ANALYSIS_SETTINGS.stabilityTargetPercent),
    1,
    50
  ),
  stabilityTopN: clamp(Math.round(candidate.stabilityTopN ?? DEFAULT_ANALYSIS_SETTINGS.stabilityTopN), 1, 20),
  stabilityBatchSize: clamp(Math.round(candidate.stabilityBatchSize ?? DEFAULT_ANALYSIS_SETTINGS.stabilityBatchSize), 2, 50),
  stabilityMaxTasks: clamp(Math.round(candidate.stabilityMaxTasks ?? DEFAULT_ANALYSIS_SETTINGS.stabilityMaxTasks), 10, 250),
  enableCalibration: candidate.enableCalibration ?? DEFAULT_ANALYSIS_SETTINGS.enableCalibration,
  calibrationFeatureCount: clamp(
    Math.round(candidate.calibrationFeatureCount ?? DEFAULT_ANALYSIS_SETTINGS.calibrationFeatureCount),
    1,
    15
  ),
  calibrationSteps: clamp(Math.round(candidate.calibrationSteps ?? DEFAULT_ANALYSIS_SETTINGS.calibrationSteps), 3, 12),
  calibrationStrategy:
    candidate.calibrationStrategy === "global_scale" || candidate.calibrationStrategy === "partial_override"
      ? candidate.calibrationStrategy
      : DEFAULT_ANALYSIS_SETTINGS.calibrationStrategy,
});

export const getStoredAnalysisSettings = (): AnalysisSettings => {
  try {
    const raw = localStorage.getItem(ANALYSIS_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ANALYSIS_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AnalysisSettings>;
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_ANALYSIS_SETTINGS;
  }
};

export const saveAnalysisSettings = (settings: Partial<AnalysisSettings>) => {
  const merged = normalizeSettings({
    ...getStoredAnalysisSettings(),
    ...settings,
  });

  localStorage.setItem(ANALYSIS_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event(ANALYSIS_SETTINGS_UPDATED_EVENT));
  return merged;
};

export const analysisRetryOptions = [1, 2, 3, 4, 5];

export const analysisTemperatureOptions = [
  { value: 0, label: '0.0 (Recommended)' },
  { value: 0.2, label: '0.2' },
  { value: 0.4, label: '0.4' },
  { value: 0.6, label: '0.6' },
  { value: 0.8, label: '0.8' },
  { value: 1.0, label: '1.0 (Most creative)' },
];

export const analysisDesignModeOptions = [
  { value: "near_bibd", label: "Near-BIBD (Recommended)" },
  { value: "legacy", label: "Legacy round-robin" },
] as const;

export const analysisEstimatorOptions = [
  { value: "bws_mnl_money", label: "BWS MNL + money model (Recommended)" },
  { value: "legacy_score", label: "Legacy score scaling" },
] as const;

export const analysisMoneyTransformOptions = [
  { value: "log1p", label: "log1p(amount) (Recommended)" },
  { value: "linear", label: "linear amount" },
] as const;

export const analysisCalibrationStrategyOptions = [
  { value: "partial_override", label: "Partial override + scale" },
  { value: "global_scale", label: "Global scale only" },
] as const;
