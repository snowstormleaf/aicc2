export const ANALYSIS_SETTINGS_STORAGE_KEY = 'analysis_settings';
export const ANALYSIS_SETTINGS_UPDATED_EVENT = 'analysis-settings-updated';

export interface AnalysisSettings {
  maxRetries: number;
  temperature: number;
  autoRecommendVouchers: boolean;
  persistResults: boolean;
  defaultUseCache: boolean;
  showProgressUpdates: boolean;
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  maxRetries: 3,
  temperature: 0.2,
  autoRecommendVouchers: true,
  persistResults: true,
  defaultUseCache: false,
  showProgressUpdates: true,
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
  showProgressUpdates: candidate.showProgressUpdates ?? DEFAULT_ANALYSIS_SETTINGS.showProgressUpdates,
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
  { value: 0, label: '0.0 (Most deterministic)' },
  { value: 0.2, label: '0.2 (Recommended)' },
  { value: 0.4, label: '0.4' },
  { value: 0.6, label: '0.6' },
  { value: 0.8, label: '0.8' },
  { value: 1.0, label: '1.0 (Most creative)' },
];
