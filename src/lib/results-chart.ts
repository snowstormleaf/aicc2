type PerceivedValue = {
  featureId: string;
  featureName: string;
  perceivedValue: number;
};

export type DifferenceRow = {
  feature: string;
  valueA: number;
  valueB: number;
  difference: number;
};

export type AxisLayout = {
  axisWidth: number;
  fontSize: number;
  leftMargin: number;
};

export type BarLayout = {
  chartHeight: number;
  barSize: number;
  barGap: number;
  barCategoryGap: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const makeFeatureKey = (item: PerceivedValue) => {
  const normalizedName = normalizeLabel(item.featureName);
  if (normalizedName) return normalizedName;
  return (item.featureId || "").trim().toLowerCase();
};

export const buildAxisLayout = (labels: string[]): AxisLayout => {
  const maxLabelLength = labels.reduce((max, label) => Math.max(max, label.length), 0);
  const axisWidth = clamp(Math.round(maxLabelLength * 7.8), 180, 420);
  const fontSize = clamp(13 - Math.floor(maxLabelLength / 24), 10, 12);
  return {
    axisWidth,
    fontSize,
    leftMargin: axisWidth + 14,
  };
};

export const buildBarLayout = ({
  rowCount,
  seriesCount,
  minHeight,
}: {
  rowCount: number;
  seriesCount: number;
  minHeight: number;
}): BarLayout => {
  const safeRows = Math.max(1, rowCount);
  const safeSeries = Math.max(1, seriesCount);
  const rowHeight = Math.max(28, safeSeries * 16 + 10);
  const chartHeight = Math.max(minHeight, safeRows * rowHeight + 120);
  const barGap = 4;
  const barSize = clamp(Math.floor((rowHeight - 12 - (safeSeries - 1) * barGap) / safeSeries), 8, 16);

  return {
    chartHeight,
    barSize,
    barGap,
    barCategoryGap: 14,
  };
};

export const buildDifferenceData = (
  personaAResults: PerceivedValue[],
  personaBResults: PerceivedValue[]
): DifferenceRow[] => {
  const merged = new Map<string, { feature: string; valueA: number; valueB: number }>();

  for (const row of personaAResults) {
    const key = makeFeatureKey(row);
    if (!key) continue;
    const existing = merged.get(key);
    merged.set(key, {
      feature: existing?.feature || row.featureName || row.featureId,
      valueA: Number.isFinite(row.perceivedValue) ? row.perceivedValue : existing?.valueA ?? 0,
      valueB: existing?.valueB ?? 0,
    });
  }

  for (const row of personaBResults) {
    const key = makeFeatureKey(row);
    if (!key) continue;
    const existing = merged.get(key);
    merged.set(key, {
      feature: existing?.feature || row.featureName || row.featureId,
      valueA: existing?.valueA ?? 0,
      valueB: Number.isFinite(row.perceivedValue) ? row.perceivedValue : existing?.valueB ?? 0,
    });
  }

  return Array.from(merged.values())
    .map((row) => ({
      feature: row.feature,
      valueA: Number(row.valueA.toFixed(2)),
      valueB: Number(row.valueB.toFixed(2)),
      difference: Number((row.valueA - row.valueB).toFixed(2)),
    }))
    .filter((row) => Number.isFinite(row.valueA) && Number.isFinite(row.valueB) && Number.isFinite(row.difference))
    .sort((left, right) => right.difference - left.difference);
};
