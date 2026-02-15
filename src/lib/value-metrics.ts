export const getValueRatio = (perceivedValue: number, materialCost: number): number | null => {
  if (!Number.isFinite(perceivedValue) || !Number.isFinite(materialCost) || materialCost <= 0) {
    return null;
  }
  return perceivedValue / materialCost;
};

export const formatRatio = (ratio: number | null, digits: number = 2): string =>
  ratio == null ? "N/A" : `${ratio.toFixed(digits)}x`;

export const classifyValueRatio = (ratio: number | null): string => {
  if (ratio == null) return "No Baseline";
  if (ratio > 1.2) return "High Value";
  if (ratio < 0.8) return "Low Value";
  return "Fair Value";
};
