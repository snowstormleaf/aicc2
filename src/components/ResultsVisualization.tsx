import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import { TrendingUp, Download, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";

import { PerceivedValue } from "@/lib/maxdiff-engine";
import type { MaxDiffCallLog } from "@/types/analysis";
import { createXlsxBlob } from "@/lib/xlsx-utils";
import { classifyValueRatio, formatRatio, getValueRatio } from "@/lib/value-metrics";
import { buildAxisLayout, buildBarLayout, buildDifferenceData } from "@/lib/results-chart";
import {
  ANALYSIS_SETTINGS_UPDATED_EVENT,
  getStoredAnalysisSettings,
} from "@/lib/analysis-settings";

interface ResultsVisualizationProps {
  results: Map<string, PerceivedValue[]>;
  callLogs: MaxDiffCallLog[];
}

type ScatterPoint = {
  featureId: string;
  featureName: string;
  materialCost: number;
  perceivedValue: number;
  netScore: number;
  persona: string;
};

type ValueOnlyRow = {
  featureId: string;
  featureName: string;
  averageValue: number;
} & Record<string, number | string>;

const PERSONA_COLORS = ["#0f766e", "#166534", "#0369a1", "#92400e", "#b91c1c", "#334155"];

const formatCurrencyInt = (value: number) => `$${Math.round(value).toLocaleString()}`;
const truncateLabel = (value: string, max = 28) => (value.length <= max ? value : `${value.slice(0, max - 1)}…`);

const getNiceAxisMax = (value: number) => {
  const safe = Math.max(1, value);
  if (safe <= 10) return Math.ceil(safe);

  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const normalized = safe / magnitude;

  let step = 10;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 2.5) step = 2.5;
  else if (normalized <= 5) step = 5;

  return step * magnitude;
};

export const ResultsVisualization = ({ results, callLogs }: ResultsVisualizationProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [hideMaterialCost, setHideMaterialCost] = useState(() => getStoredAnalysisSettings().hideMaterialCost);
  const [parityPercent, setParityPercent] = useState<number[]>([100]);

  const personas = useMemo(() => Array.from(results.keys()), [results]);
  const valueOnlySeries = useMemo(
    () => personas.map((persona, index) => ({ persona, key: `value_${index}` })),
    [personas]
  );

  const [personaA, setPersonaA] = useState<string>(personas[0] ?? "");
  const [personaB, setPersonaB] = useState<string>(personas[1] ?? "");

  useEffect(() => {
    const sync = () => {
      setHideMaterialCost(getStoredAnalysisSettings().hideMaterialCost);
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "analysis_settings") {
        sync();
      }
    };

    sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (personas.length === 0) {
      setPersonaA("");
      setPersonaB("");
      return;
    }

    const nextA = personas.includes(personaA) ? personaA : personas[0];
    const nextB = personas.includes(personaB) && personaB !== nextA
      ? personaB
      : personas.find((persona) => persona !== nextA) ?? nextA;

    if (nextA !== personaA) setPersonaA(nextA);
    if (nextB !== personaB) setPersonaB(nextB);
  }, [personas, personaA, personaB]);

  const allData = useMemo(() => {
    const points: ScatterPoint[] = [];
    for (const [persona, perceivedValues] of results.entries()) {
      for (const result of perceivedValues) {
        points.push({
          featureId: result.featureId,
          featureName: result.featureName,
          materialCost: result.materialCost,
          perceivedValue: result.perceivedValue,
          netScore: result.netScore,
          persona,
        });
      }
    }
    return points;
  }, [results]);

  const byPersona = useMemo(() => {
    const map = new Map<string, ScatterPoint[]>();
    personas.forEach((persona) => {
      map.set(persona, allData.filter((point) => point.persona === persona));
    });
    return map;
  }, [allData, personas]);

  const valueOnlyData = useMemo(() => {
    const featureMap = new Map<string, ValueOnlyRow>();

    for (const [persona, perceivedValues] of results.entries()) {
      const seriesKey = valueOnlySeries.find((series) => series.persona === persona)?.key;
      if (!seriesKey) continue;

      for (const value of perceivedValues) {
        const existing = featureMap.get(value.featureId);
        if (existing) {
          existing[seriesKey] = value.perceivedValue;
          existing.averageValue =
            valueOnlySeries.reduce((sum, series) => sum + Number(existing[series.key] ?? 0), 0) / valueOnlySeries.length;
        } else {
          const row: ValueOnlyRow = {
            featureId: value.featureId,
            featureName: value.featureName,
            averageValue: 0,
          };
          valueOnlySeries.forEach((series) => {
            row[series.key] = 0;
          });
          row[seriesKey] = value.perceivedValue;
          row.averageValue = value.perceivedValue;
          featureMap.set(value.featureId, row);
        }
      }
    }

    return Array.from(featureMap.values())
      .map((row) => ({
        ...row,
        averageValue:
          valueOnlySeries.reduce((sum, series) => sum + Number(row[series.key] ?? 0), 0) /
          Math.max(1, valueOnlySeries.length),
      }))
      .sort((a, b) => Number(b.averageValue) - Number(a.averageValue));
  }, [results, valueOnlySeries]);

  const maxMaterialCost = allData.length ? Math.max(...allData.map((d) => d.materialCost)) : 1;
  const maxPerceivedValue = allData.length ? Math.max(...allData.map((d) => d.perceivedValue)) : 1;
  const xAxisMax = getNiceAxisMax(maxMaterialCost * 1.05);
  const yAxisMax = getNiceAxisMax(maxPerceivedValue * 1.05);
  const paritySlope = Math.max(0.01, (parityPercent[0] ?? 100) / 100);
  const parityMaxX = Math.min(xAxisMax, yAxisMax / paritySlope);

  const differenceData = useMemo(() => {
    if (!personaA || !personaB || personaA === personaB) return [];
    const persona1Results = results.get(personaA) ?? [];
    const persona2Results = results.get(personaB) ?? [];
    return buildDifferenceData(persona1Results, persona2Results);
  }, [personaA, personaB, results]);

  const valueOnlyAxisLayout = useMemo(
    () => buildAxisLayout(valueOnlyData.map((row) => row.featureName)),
    [valueOnlyData]
  );
  const valueOnlyAxisWidth = useMemo(
    () => Math.min(230, valueOnlyAxisLayout.axisWidth),
    [valueOnlyAxisLayout.axisWidth]
  );
  const comparisonAxisLayout = useMemo(
    () => buildAxisLayout(differenceData.map((row) => row.feature)),
    [differenceData]
  );
  const comparisonAxisWidth = useMemo(
    () => Math.min(220, comparisonAxisLayout.axisWidth),
    [comparisonAxisLayout.axisWidth]
  );
  const differenceChartRows = useMemo(
    () => differenceData,
    [differenceData]
  );
  const valueOnlyBarLayout = useMemo(
    () =>
      buildBarLayout({
        rowCount: valueOnlyData.length,
        seriesCount: valueOnlySeries.length,
        minHeight: 420,
      }),
    [valueOnlyData.length, valueOnlySeries.length]
  );
  const comparisonBarLayout = useMemo(
    () =>
      buildBarLayout({
        rowCount: differenceChartRows.length,
        seriesCount: 1,
        minHeight: 320,
      }),
    [differenceChartRows.length]
  );
  const differenceDomain = useMemo<[number, number]>(() => {
    if (differenceChartRows.length === 0) return [-1, 1];
    const minDiff = Math.min(...differenceChartRows.map((row) => row.difference), 0);
    const maxDiff = Math.max(...differenceChartRows.map((row) => row.difference), 0);
    const spread = maxDiff - minDiff;
    const pad = Math.max(1, spread * 0.08);
    return [minDiff - pad, maxDiff + pad];
  }, [differenceChartRows]);

  const downloadResults = () => {
    let csvContent = "Persona,Feature Name,Description,Material Cost (USD),Perceived Value (USD),Value Ratio,Category\n";

    for (const [persona, perceivedValues] of results.entries()) {
      csvContent +=
        perceivedValues
          .map((r) => {
            const ratio = getValueRatio(r.perceivedValue, r.materialCost);
            const category = classifyValueRatio(ratio);
            const ratioLabel = ratio == null ? "N/A" : ratio.toFixed(2);
            return `"${persona}","${r.featureName}","Feature ${r.featureId}",${r.materialCost},${r.perceivedValue.toFixed(
              2
            )},${ratioLabel},${category}`;
          })
          .join("\n") + "\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "maxdiff-analysis-results.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const resultsRows: (string | number)[][] = [["Feature", "Material cost", "Value", "Persona"]];

    personas.forEach((persona) => {
      const personaResults = results.get(persona) ?? [];
      const sortedResults = [...personaResults].sort((a, b) => b.perceivedValue - a.perceivedValue);
      sortedResults.forEach((result) => {
        resultsRows.push([result.featureName, result.materialCost, result.perceivedValue, persona]);
      });
    });

    const callsRows: (string | number)[][] = [
      [
        "Timestamp (UTC)",
        "Persona",
        "Set",
        "Status",
        "Displayed feature 1",
        "Displayed feature 2",
        "Displayed feature 3",
        "Displayed feature 4",
        "Most valued",
        "Least valued",
      ],
    ];

    callLogs.forEach((log) => {
      const displayed = [...log.displayedFeatures];
      while (displayed.length < 4) displayed.push("");
      callsRows.push([
        log.timestamp,
        log.personaName ?? "",
        log.setId ?? "",
        log.status ?? "",
        displayed[0] ?? "",
        displayed[1] ?? "",
        displayed[2] ?? "",
        displayed[3] ?? "",
        log.mostValued,
        log.leastValued,
      ]);
    });

    const blob = createXlsxBlob([
      { name: "Results", rows: resultsRows },
      { name: "MaxDiff API Calls", rows: callsRows },
    ]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "maxdiff-analysis.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (results.size === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">No results to display. Please run the analysis first.</p>
          <Button onClick={downloadExcel} variant="analytics" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        </div>
      </Card>
    );
  }

  type TooltipPayload = {
    featureId: string;
    featureName: string;
    materialCost: number;
    perceivedValue: number;
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    const data = payload?.[0]?.payload as TooltipPayload | undefined;
    if (!active || !payload?.length || !data) return null;

    const ratio = getValueRatio(data.perceivedValue, data.materialCost);
    const ratioClass =
      ratio == null
        ? "text-muted-foreground"
        : ratio > 1.2
          ? "text-data-positive"
          : ratio < 0.8
            ? "text-data-negative"
            : "text-muted-foreground";

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium">{data.featureName}</p>
        <p className="mb-2 text-xs text-muted-foreground">Feature ID: {data.featureId}</p>
        <div className="space-y-1 text-xs">
          <p>
            Material Cost: <span className="font-medium">{formatCurrencyInt(data.materialCost)}</span>
          </p>
          <p>
            Perceived Value: <span className="font-medium">{formatCurrencyInt(data.perceivedValue)}</span>
          </p>
          <p>
            Value Ratio: <span className={`font-medium ${ratioClass}`}>{formatRatio(ratio)}</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="type-caption">Step 5</p>
        <h2 className="type-headline">Perceived Feature Values</h2>
        <p className="type-deck mx-auto content-measure">
          {hideMaterialCost
            ? "Feature perceived value ranking"
            : "Material cost vs. perceived customer value from MaxDiff analysis"}
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20" id="insights-export">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                AI Customer Clinic Results
              </CardTitle>
              <CardDescription>
                {hideMaterialCost
                  ? "Perceived value only, sorted high-to-low"
                  : "Scatter plot of perceived customer value (Y-axis) vs feature material cost (X-axis)"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={downloadExcel} variant="analytics" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hideMaterialCost ? (
            <>
              <div className="h-[420px] w-full overflow-hidden rounded-md border border-border-subtle bg-background/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 18, bottom: 18, left: 6 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="materialCost"
                      name="Material Cost"
                      domain={[0, xAxisMax]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrencyInt(Number(value))}
                    />
                    <YAxis
                      type="number"
                      dataKey="perceivedValue"
                      name="Perceived Value"
                      domain={[0, yAxisMax]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrencyInt(Number(value))}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "11px", paddingBottom: "4px" }} />
                    <ReferenceLine
                      segment={[
                        { x: 0, y: 0 },
                        { x: parityMaxX, y: parityMaxX * paritySlope },
                      ]}
                      stroke="#64748b"
                      strokeDasharray="5 5"
                    />
                    {personas.map((persona, index) => (
                      <Scatter
                        key={persona}
                        data={byPersona.get(persona) ?? []}
                        name={persona}
                        fill={PERSONA_COLORS[index % PERSONA_COLORS.length]}
                        stroke={PERSONA_COLORS[index % PERSONA_COLORS.length]}
                        fillOpacity={0.82}
                        strokeWidth={1.5}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 rounded-md border border-border-subtle bg-background/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">Parity line: {parityPercent[0]}%</span>
                  <span className="text-muted-foreground">100% means value = cost</span>
                </div>
                <Slider
                  min={40}
                  max={200}
                  step={5}
                  value={parityPercent}
                  onValueChange={setParityPercent}
                  aria-label="Parity line percentage"
                />
              </div>
            </>
          ) : (
            <div className="w-full overflow-hidden rounded-md border border-border-subtle bg-background/60 p-3" style={{ height: `${valueOnlyBarLayout.chartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={valueOnlyData}
                  layout="vertical"
                  margin={{ top: 20, right: 14, bottom: 20, left: 12 }}
                  barCategoryGap={valueOnlyBarLayout.barCategoryGap}
                  barGap={valueOnlyBarLayout.barGap}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrencyInt(Number(value))} />
                  <YAxis
                    dataKey="featureName"
                    type="category"
                    width={valueOnlyAxisWidth}
                    tick={{ fontSize: valueOnlyAxisLayout.fontSize }}
                    interval={0}
                    tickFormatter={(value) => truncateLabel(String(value))}
                  />
                  <Tooltip formatter={(value) => formatCurrencyInt(Number(value))} />
                  <Legend />
                  {valueOnlySeries.map((series, index) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.persona}
                      fill={PERSONA_COLORS[index % PERSONA_COLORS.length]}
                      barSize={valueOnlyBarLayout.barSize}
                      radius={[0, 6, 6, 0]}
                      minPointSize={2}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {personas.length > 1 && (
        <Card id="insights-compare">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Difference in Perceived Value: {personaA || "Persona A"} - {personaB || "Persona B"}
                </CardTitle>
                <CardDescription>
                  Per-feature delta sorted from most positive to most negative (Persona A minus Persona B)
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Persona A</p>
                  <Select value={personaA} onValueChange={setPersonaA}>
                    <SelectTrigger className="w-[210px]">
                      <SelectValue placeholder="Select persona A" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona} value={persona}>
                          {persona}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Persona B</p>
                  <Select value={personaB} onValueChange={setPersonaB}>
                    <SelectTrigger className="w-[210px]">
                      <SelectValue placeholder="Select persona B" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona} value={persona}>
                          {persona}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {personaA === personaB ? (
              <p className="text-sm text-muted-foreground">Select two different personas to compare.</p>
            ) : differenceData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overlapping features to compare for these personas.</p>
            ) : (
              <div className="w-full overflow-hidden rounded-md border border-border-subtle bg-background/60 p-3" style={{ height: `${comparisonBarLayout.chartHeight}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={differenceChartRows}
                    layout="vertical"
                    margin={{ top: 20, right: 16, bottom: 20, left: 12 }}
                    barCategoryGap={comparisonBarLayout.barCategoryGap}
                    barGap={comparisonBarLayout.barGap}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={differenceDomain}
                      tickFormatter={(value) => formatCurrencyInt(Number(value))}
                      label={{ value: `${personaA} minus ${personaB}`, position: "insideBottom", offset: -10 }}
                    />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      width={comparisonAxisWidth}
                      tick={{ fontSize: comparisonAxisLayout.fontSize }}
                      interval={0}
                      tickFormatter={(value) => truncateLabel(String(value))}
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(_, __, item) => {
                        const payload = item?.payload as { difference?: number; valueA?: number; valueB?: number } | undefined;
                        const difference = Number(payload?.difference ?? 0);
                        return [formatCurrencyInt(difference), `${personaA} - ${personaB}`];
                      }}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload as { feature?: string; valueA?: number; valueB?: number } | undefined;
                        if (!row) return String(label);
                        return `${row.feature} (${personaA}: ${formatCurrencyInt(Number(row.valueA ?? 0))}, ${personaB}: ${formatCurrencyInt(Number(row.valueB ?? 0))})`;
                      }}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <Bar dataKey="difference" minPointSize={3} barSize={comparisonBarLayout.barSize} activeBar={false}>
                      {differenceChartRows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.difference > 0 ? "#0ea5e9" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card id="insights-detail">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Detailed Results</CardTitle>
              <CardDescription>Feature analysis by persona</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowDetails((current) => !current)}>
              {showDetails ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  View less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  View more
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="space-y-6">
              {personas.map((persona) => {
                const personaResults = results.get(persona) ?? [];
                return (
                  <div key={persona} className="space-y-2">
                    <h4 className="text-lg font-semibold">{persona}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead className="text-right">Material Cost</TableHead>
                          <TableHead className="text-right">Perceived Value</TableHead>
                          <TableHead className="text-right">Net Score</TableHead>
                          <TableHead className="text-right">Value Ratio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {[...personaResults]
                            .sort((a, b) => b.perceivedValue - a.perceivedValue)
                            .map((result) => (
                              <TableRow key={result.featureId}>
                                <TableCell>{result.featureName}</TableCell>
                                <TableCell className="text-right">${result.materialCost.toFixed(2)}</TableCell>
                                <TableCell className="text-right">${result.perceivedValue.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{result.netScore}</TableCell>
                                <TableCell className="text-right">
                                  {formatRatio(getValueRatio(result.perceivedValue, result.materialCost))}
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
