export type ServiceTier = 'standard' | 'flex';

export interface ModelPricing {
  input: number;
  cachedInput: number;
  output: number;
}

export const MODEL_PRICING: Record<ServiceTier, Record<string, ModelPricing>> = {
  flex: {
    'gpt-5.2': { input: 0.875, cachedInput: 0.0875, output: 7.0 },
    'gpt-5.1': { input: 0.625, cachedInput: 0.0625, output: 5.0 },
    'gpt-5': { input: 0.625, cachedInput: 0.0625, output: 5.0 },
    'gpt-5-mini': { input: 0.125, cachedInput: 0.0125, output: 1.0 },
    'gpt-5-nano': { input: 0.025, cachedInput: 0.0025, output: 0.2 }
  },
  standard: {
    'gpt-5.2': { input: 1.75, cachedInput: 0.175, output: 14.0 },
    'gpt-5.1': { input: 1.25, cachedInput: 0.125, output: 10.0 },
    'gpt-5': { input: 1.25, cachedInput: 0.125, output: 10.0 },
    'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2.0 },
    'gpt-5-nano': { input: 0.05, cachedInput: 0.005, output: 0.4 }
  }
};

export const SERVICE_TIERS: Array<{ id: ServiceTier; label: string; description: string }> = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Default performance with higher throughput and availability.'
  },
  {
    id: 'flex',
    label: 'Flex (beta)',
    description: 'Lower prices with slower responses and occasional resource unavailability.'
  }
];

export const MODEL_OPTIONS = Object.keys(MODEL_PRICING.standard);

export const MODEL_STORAGE_KEYS = {
  model: 'openai_model',
  serviceTier: 'openai_service_tier'
};

export const DEFAULT_SERVICE_TIER: ServiceTier = 'standard';
export const DEFAULT_MODEL = 'gpt-5-mini';

export const getStoredModelConfig = () => {
  const storedTier = localStorage.getItem(MODEL_STORAGE_KEYS.serviceTier) as ServiceTier | null;
  const serviceTier = storedTier && storedTier in MODEL_PRICING ? storedTier : DEFAULT_SERVICE_TIER;
  const storedModel = localStorage.getItem(MODEL_STORAGE_KEYS.model);
  const model = storedModel && MODEL_PRICING[serviceTier][storedModel]
    ? storedModel
    : DEFAULT_MODEL;

  return { serviceTier, model };
};

export const formatPrice = (value: number) => `$${value.toFixed(3).replace(/\.0+$/, '')}`;
