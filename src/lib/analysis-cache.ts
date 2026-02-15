interface CacheFeatureInput {
  id: string;
  name: string;
  description?: string;
  materialCost: number;
}

interface AnalysisCacheKeyParams {
  vehicleId: string;
  personaId: string;
  model: string;
  serviceTier: string;
  features: CacheFeatureInput[];
  algorithmVersion?: string;
}

const ANALYSIS_CACHE_PREFIX = "maxdiff";
const DEFAULT_ALGORITHM_VERSION = "v2";

const fnv1a = (value: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const buildFeatureFingerprint = (features: CacheFeatureInput[]) => {
  const canonical = [...features]
    .map((feature) => ({
      id: feature.id,
      name: feature.name,
      description: feature.description ?? "",
      materialCost: Number.isFinite(feature.materialCost) ? Number(feature.materialCost) : 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return fnv1a(JSON.stringify(canonical));
};

export const buildAnalysisCacheKey = ({
  vehicleId,
  personaId,
  model,
  serviceTier,
  features,
  algorithmVersion = DEFAULT_ALGORITHM_VERSION,
}: AnalysisCacheKeyParams) => {
  const featureFingerprint = buildFeatureFingerprint(features);
  return [
    ANALYSIS_CACHE_PREFIX,
    algorithmVersion,
    vehicleId,
    personaId,
    model,
    serviceTier,
    featureFingerprint,
  ].join(":");
};
