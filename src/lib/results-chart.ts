type PerceivedValue = {
  featureId: string;
  featureName: string;
  perceivedValue: number;
};

export type DifferenceRow = {
  feature: string;
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

const normalizeLabel = (value: string) => value.trim().toLowerCase();

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

const buildByNameIndex = (items: PerceivedValue[]) => {
  const index = new Map<string, PerceivedValue>();
  for (const item of items) {
    const key = normalizeLabel(item.featureName);
    if (!index.has(key)) {
      index.set(key, item);
    }
  }
  return index;
};

export const buildDifferenceData = (
  personaAResults: PerceivedValue[],
  personaBResults: PerceivedValue[]
): DifferenceRow[] => {
  if (personaAResults.length === 0 || personaBResults.length === 0) return [];

  const bById = new Map(personaBResults.map((item) => [item.featureId, item]));
  const bByName = buildByNameIndex(personaBResults);
  const usedB = new Set<string>();
  const rows: DifferenceRow[] = [];

  for (const a of personaAResults) {
    const byId = bById.get(a.featureId);
    const byName = bByName.get(normalizeLabel(a.featureName));
    const match = byId ?? byName;

    if (match) {
      usedB.add(match.featureId);
      rows.push({
        feature: a.featureName,
        difference: Number((a.perceivedValue - match.perceivedValue).toFixed(2)),
      });
    } else {
      rows.push({
        feature: a.featureName,
        difference: Number(a.perceivedValue.toFixed(2)),
      });
    }
  }

  for (const b of personaBResults) {
    if (usedB.has(b.featureId)) continue;
    rows.push({
      feature: b.featureName,
      difference: Number((-b.perceivedValue).toFixed(2)),
    });
  }

  return rows
    .filter((row) => Number.isFinite(row.difference))
    .sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));
};
