import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const PERSONA_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#e11d48", "#a855f7", "#14b8a6"];

const formatCurrencyInt = (value: number) => `$${Math.round(value).toLocaleString()}`;

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
  const personas = Array.from(results.keys());

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

  const maxMaterialCost = allData.length ? Math.max(...allData.map((d) => d.materialCost)) : 1;
  const maxPerceivedValue = allData.length ? Math.max(...allData.map((d) => d.perceivedValue)) : 1;
  const xAxisMax = getNiceAxisMax(maxMaterialCost * 1.05);
  const yAxisMax = getNiceAxisMax(maxPerceivedValue * 1.05);
  const parityMax = Math.min(xAxisMax, yAxisMax);

  const differenceData = useMemo(() => {
    if (personas.length !== 2) return [];
    const persona1Results = results.get(personas[0]) ?? [];
    const persona2Results = results.get(personas[1]) ?? [];
    return persona1Results
      .map((p1) => {
        const p2 = persona2Results.find((p) => p.featureId === p1.featureId);
        return {
          feature: p1.featureId,
          difference: p1.perceivedValue - (p2?.perceivedValue ?? 0),
        };
      })
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [personas, results]);

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
    const resultsRows: (string | number)[][] = [["Feature", "Material cost", "Value"]];

    personas.forEach((persona) => {
      const personaResults = results.get(persona) ?? [];
      const sortedResults = [...personaResults].sort((a, b) => b.perceivedValue - a.perceivedValue);
      sortedResults.forEach((result) => {
        resultsRows.push([result.featureName, result.materialCost, result.perceivedValue]);
      });
    });

    const callsRows: (string | number)[][] = [
      [
        "Timestamp (UTC)",
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
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Perceived Feature Values</h2>
        <p className="text-muted-foreground">Material cost vs. perceived customer value from MaxDiff analysis</p>
      </div>

      <Card className="border-primary/10 bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                AI Customer Clinic Results
              </CardTitle>
              <CardDescription>
                Scatter plot of perceived customer value (Y-axis) vs feature material cost (X-axis)
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
          <div className="h-96 w-full rounded-md border bg-background/60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="materialCost"
                  name="Material Cost"
                  domain={[0, xAxisMax]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyInt(Number(value))}
                  label={{ value: "Feature material cost", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="perceivedValue"
                  name="Perceived Value"
                  domain={[0, yAxisMax]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyInt(Number(value))}
                  label={{ value: "Perceived customer value", angle: -90, position: "insideLeft" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "12px" }} />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: parityMax, y: parityMax },
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

          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-3 bg-slate-500" />
              <span>Parity line (value = cost)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>X max: {formatCurrencyInt(xAxisMax)}</span>
              <span>·</span>
              <span>Y max: {formatCurrencyInt(yAxisMax)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {personas.length === 2 && differenceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Difference in Perceived Value: {personas[0]} vs {personas[1]}
            </CardTitle>
            <CardDescription>Features where personas differ most in perceived value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={differenceData.slice(0, 10)} margin={{ top: 20, right: 20, bottom: 20, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrencyInt(Number(value))}
                    label={{ value: `${personas[0]} minus ${personas[1]}`, position: "insideBottom", offset: -10 }}
                  />
                  <YAxis dataKey="feature" type="category" width={120} />
                  <Tooltip formatter={(value) => [formatCurrencyInt(Number(value)), "Difference"]} />
                  <Bar dataKey="difference">
                    {differenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.difference > 0 ? "#0ea5e9" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
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
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="border-b px-4 py-2 text-left">Feature</th>
                            <th className="border-b px-4 py-2 text-right">Material Cost</th>
                            <th className="border-b px-4 py-2 text-right">Perceived Value</th>
                            <th className="border-b px-4 py-2 text-right">Net Score</th>
                            <th className="border-b px-4 py-2 text-right">Value Ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...personaResults]
                            .sort((a, b) => b.perceivedValue - a.perceivedValue)
                            .map((result) => (
                              <tr key={result.featureId}>
                                <td className="border-b px-4 py-2">{result.featureName}</td>
                                <td className="border-b px-4 py-2 text-right">${result.materialCost.toFixed(2)}</td>
                                <td className="border-b px-4 py-2 text-right">${result.perceivedValue.toFixed(2)}</td>
                                <td className="border-b px-4 py-2 text-right">{result.netScore}</td>
                                <td className="border-b px-4 py-2 text-right">
                                  {formatRatio(getValueRatio(result.perceivedValue, result.materialCost))}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
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
