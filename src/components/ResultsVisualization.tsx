import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { TrendingUp, Download, FileSpreadsheet, FileJson, ChevronDown, ChevronUp } from "lucide-react";

import { PerceivedValue, type PersonaAnalysisSummary } from "@/lib/maxdiff-engine";
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
  summaries: Map<string, PersonaAnalysisSummary>;
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

export const ResultsVisualization = ({ results, callLogs, summaries }: ResultsVisualizationProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [hideMaterialCost, setHideMaterialCost] = useState(() => getStoredAnalysisSettings().hideMaterialCost);
  const [allowNegativeWtp, setAllowNegativeWtp] = useState(false);
  const [parityPercent, setParityPercent] = useState<number[]>([100]);

  const personas = useMemo(() => Array.from(results.keys()), [results]);
  const valueOnlySeries = useMemo(
    () => personas.map((persona, index) => ({ persona, key: `value_${index}` })),
    [personas]
  );

  const [personaA, setPersonaA] = useState<string>(personas[0] ?? "");
  const [personaB, setPersonaB] = useState<string>(personas[1] ?? "");

  const displayedResults = useMemo(() => {
    const map = new Map<string, PerceivedValue[]>();
    for (const [persona, rows] of results.entries()) {
      map.set(
        persona,
        rows.map((row) => {
          const displayValue = allowNegativeWtp
            ? (row.adjustedWtp ?? row.rawWtp ?? row.perceivedValue)
            : (row.displayWtp ?? Math.max(0, row.perceivedValue));
          return {
            ...row,
            perceivedValue: displayValue,
          };
        })
      );
    }
    return map;
  }, [allowNegativeWtp, results]);

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
    for (const [persona, perceivedValues] of displayedResults.entries()) {
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
  }, [displayedResults]);

  const byPersona = useMemo(() => {
    const map = new Map<string, ScatterPoint[]>();
    personas.forEach((persona) => {
      map.set(persona, allData.filter((point) => point.persona === persona));
    });
    return map;
  }, [allData, personas]);

  const valueOnlyData = useMemo(() => {
    const featureMap = new Map<string, ValueOnlyRow>();

    for (const [persona, perceivedValues] of displayedResults.entries()) {
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
  }, [displayedResults, valueOnlySeries]);

  const maxMaterialCost = allData.length ? Math.max(...allData.map((d) => d.materialCost)) : 1;
  const maxPerceivedValue = allData.length ? Math.max(...allData.map((d) => d.perceivedValue)) : 1;
  const minPerceivedValue = allData.length ? Math.min(...allData.map((d) => d.perceivedValue)) : 0;
  const xAxisMax = getNiceAxisMax(maxMaterialCost * 1.05);
  const yAxisMax = getNiceAxisMax(maxPerceivedValue * 1.05);
  const yAxisMin = minPerceivedValue < 0 ? -getNiceAxisMax(Math.abs(minPerceivedValue) * 1.05) : 0;
  const paritySlope = Math.max(0.01, (parityPercent[0] ?? 100) / 100);
  const parityMaxX = Math.min(xAxisMax, yAxisMax / paritySlope);

  const differenceData = useMemo(() => {
    if (!personaA || !personaB || personaA === personaB) return [];
    const persona1Results = displayedResults.get(personaA) ?? [];
    const persona2Results = displayedResults.get(personaB) ?? [];
    return buildDifferenceData(persona1Results, persona2Results);
  }, [displayedResults, personaA, personaB]);

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
    let csvContent =
      "Persona,Feature ID,Feature Name,Material Cost (USD),Perceived Value (USD),Raw Model WTP (USD),Adjusted WTP (USD),Utility,CI 2.5%,CI 97.5%,Bootstrap Mean,Bootstrap Median,Bootstrap CV,Relative CI Width,Adjustment Source,Calibration Mid,Calibration Lower,Calibration Upper,Beta,Transform,Estimator,Design Mode,Repeatability Joint,Repeatability Joint Matches,Repeatability Total Pairs,Failure Rate,Design Item CV,Design Pair CV,Pair Coverage,Voucher Best Rate,Voucher Worst Rate,Voucher Chosen Rate,Voucher Level Counts,Stability Status,Stop Reason,Calibration Strategy,Calibration Scale,Value Ratio,Category\n";

    for (const [persona, perceivedValues] of results.entries()) {
      const summary = summaries.get(persona);
      csvContent +=
        perceivedValues
          .map((r) => {
            const ratio = getValueRatio(r.perceivedValue, r.materialCost);
            const category = classifyValueRatio(ratio);
            const ratioLabel = ratio == null ? "N/A" : ratio.toFixed(2);
            return [
              `"${persona}"`,
              `"${r.featureId}"`,
              `"${r.featureName}"`,
              Number(r.materialCost.toFixed(2)),
              Number(r.perceivedValue.toFixed(2)),
              r.rawWtp != null ? Number(r.rawWtp.toFixed(2)) : "",
              r.adjustedWtp != null ? Number(r.adjustedWtp.toFixed(2)) : "",
              r.utility != null ? Number(r.utility.toFixed(6)) : "",
              r.ciLower95 != null ? Number(r.ciLower95.toFixed(2)) : "",
              r.ciUpper95 != null ? Number(r.ciUpper95.toFixed(2)) : "",
              r.bootstrapMean != null ? Number(r.bootstrapMean.toFixed(2)) : "",
              r.bootstrapMedian != null ? Number(r.bootstrapMedian.toFixed(2)) : "",
              r.bootstrapCv != null ? Number((r.bootstrapCv ?? 0).toFixed(4)) : "",
              r.relativeCiWidth != null ? Number((r.relativeCiWidth ?? 0).toFixed(4)) : "",
              `"${r.adjustmentSource ?? ""}"`,
              r.calibrationMid != null ? Number(r.calibrationMid.toFixed(2)) : "",
              r.calibrationLower != null ? Number(r.calibrationLower.toFixed(2)) : "",
              r.calibrationUpper != null ? Number(r.calibrationUpper.toFixed(2)) : "",
              summary?.beta != null ? Number(summary.beta.toFixed(6)) : "",
              `"${summary?.moneyTransform ?? ""}"`,
              `"${summary?.estimator ?? ""}"`,
              `"${summary?.designMode ?? ""}"`,
              summary?.repeatability ? Number(summary.repeatability.jointAgreementRate.toFixed(4)) : "",
              summary?.repeatability ? summary.repeatability.jointAgreementCount : "",
              summary?.repeatability ? summary.repeatability.totalRepeatPairs : "",
              summary?.failureRate != null ? Number(summary.failureRate.toFixed(4)) : "",
              summary?.designDiagnostics ? Number(summary.designDiagnostics.itemSummary.cv.toFixed(4)) : "",
              summary?.designDiagnostics ? Number(summary.designDiagnostics.pairSummary.observedPairs.cv.toFixed(4)) : "",
              summary?.designDiagnostics ? Number(summary.designDiagnostics.pairSummary.coverage.toFixed(4)) : "",
              summary?.moneySignal != null ? Number(summary.moneySignal.voucherBestRate.toFixed(4)) : "",
              summary?.moneySignal != null ? Number(summary.moneySignal.voucherWorstRate.toFixed(4)) : "",
              summary?.moneySignal != null ? Number(summary.moneySignal.voucherChosenRate.toFixed(4)) : "",
              `"${summary?.moneySignal ? JSON.stringify(summary.moneySignal.voucherLevelCounts) : ""}"`,
              `"${summary?.stabilization?.statusLabel ?? ""}"`,
              `"${summary?.stopReason ?? summary?.stabilization?.stopReason ?? ""}"`,
              `"${summary?.calibration?.strategy ?? ""}"`,
              summary?.calibration ? Number(summary.calibration.scaleFactor.toFixed(6)) : "",
              ratioLabel,
              category,
            ].join(",");
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
    const resultsRows: (string | number)[][] = [
      [
        "Feature",
        "Feature ID",
        "Material cost",
        "Perceived value",
        "Raw model WTP",
        "Adjusted WTP",
        "Utility",
        "CI low",
        "CI high",
        "Persona",
      ],
    ];

    personas.forEach((persona) => {
      const personaResults = results.get(persona) ?? [];
      const sortedResults = [...personaResults].sort((a, b) => b.perceivedValue - a.perceivedValue);
      sortedResults.forEach((result) => {
        resultsRows.push([
          result.featureName,
          result.featureId,
          result.materialCost,
          result.perceivedValue,
          result.rawWtp ?? "",
          result.adjustedWtp ?? "",
          result.utility ?? "",
          result.ciLower95 ?? "",
          result.ciUpper95 ?? "",
          persona,
        ]);
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

    const summaryRows: (string | number)[][] = [
      [
        "Persona",
        "Estimator",
        "Money transform",
        "Beta",
        "Repeatability joint",
        "Repeatability joint matches",
        "Repeatability total pairs",
        "Failure rate",
        "Design mode",
        "Item CV",
        "Pair CV",
        "Pair coverage",
        "Voucher best rate",
        "Voucher worst rate",
        "Voucher chosen rate",
        "Voucher level counts",
        "Stability status",
        "Stop reason",
        "Calibration enabled",
        "Calibration strategy",
        "Calibration scale",
      ],
    ];
    personas.forEach((persona) => {
      const summary = summaries.get(persona);
      summaryRows.push([
        persona,
        summary?.estimator ?? "",
        summary?.moneyTransform ?? "",
        summary?.beta ?? "",
        summary?.repeatability?.jointAgreementRate ?? "",
        summary?.repeatability?.jointAgreementCount ?? "",
        summary?.repeatability?.totalRepeatPairs ?? "",
        summary?.failureRate ?? "",
        summary?.designMode ?? "",
        summary?.designDiagnostics?.itemSummary.cv ?? "",
        summary?.designDiagnostics?.pairSummary.observedPairs.cv ?? "",
        summary?.designDiagnostics?.pairSummary.coverage ?? "",
        summary?.moneySignal?.voucherBestRate ?? "",
        summary?.moneySignal?.voucherWorstRate ?? "",
        summary?.moneySignal?.voucherChosenRate ?? "",
        summary?.moneySignal ? JSON.stringify(summary.moneySignal.voucherLevelCounts) : "",
        summary?.stabilization?.statusLabel ?? "",
        summary?.stopReason ?? summary?.stabilization?.stopReason ?? "",
        summary?.calibration?.enabled ? "yes" : "no",
        summary?.calibration?.strategy ?? "",
        summary?.calibration?.scaleFactor ?? "",
      ]);
    });

    const blob = createXlsxBlob([
      { name: "Results", rows: resultsRows },
      { name: "Method summary", rows: summaryRows },
      { name: "MaxDiff API Calls", rows: callsRows },
    ]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "maxdiff-analysis.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      results: Object.fromEntries(results.entries()),
      summaries: Object.fromEntries(summaries.entries()),
      callLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "maxdiff-analysis-results.json";
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
              <div className="mr-2 flex items-center gap-2 rounded-md border border-border-subtle px-3 py-1.5">
                <Switch id="allow-negative-wtp" checked={allowNegativeWtp} onCheckedChange={setAllowNegativeWtp} />
                <Label htmlFor="allow-negative-wtp" className="cursor-pointer text-xs">
                  Allow negative WTP
                </Label>
              </div>
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={downloadJson} variant="outline" size="sm">
                <FileJson className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button onClick={downloadExcel} variant="analytics" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {personas.length > 0 && (
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {personas.map((persona) => {
                const summary = summaries.get(persona);
                const stability = summary?.stabilization;
                const repeatPairs = summary?.repeatability?.totalRepeatPairs ?? 0;
                const repeatJoint = summary?.repeatability?.jointAgreementCount ?? 0;
                const repeatRate = summary?.repeatability?.jointAgreementRate ?? 0;
                const repeatabilityLabel =
                  repeatPairs < 2
                    ? "Repeatability N/A (insufficient repeats)"
                    : `Repeatability ${repeatJoint}/${repeatPairs} (${(repeatRate * 100).toFixed(1)}%)`;
                const voucherExposureValues = summary?.moneySignal
                  ? Object.values(summary.moneySignal.voucherLevelCounts)
                  : [];
                const voucherExposureMin = voucherExposureValues.length > 0 ? Math.min(...voucherExposureValues) : 0;
                const voucherExposureMax = voucherExposureValues.length > 0 ? Math.max(...voucherExposureValues) : 0;
                return (
                  <div key={`${persona}-summary`} className="rounded-md border border-border-subtle bg-background/70 p-3 text-xs">
                    <p className="mb-1 font-semibold text-foreground">{persona}</p>
                    <p className="text-muted-foreground">
                      {summary?.estimator ?? "n/a"} · {summary?.moneyTransform ?? "n/a"} · β{" "}
                      {summary?.beta != null ? summary.beta.toFixed(4) : "n/a"}
                    </p>
                    <p className="text-muted-foreground">
                      {repeatabilityLabel} · Failure {((summary?.failureRate ?? 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-muted-foreground">
                      Pair coverage {((summary?.designDiagnostics?.pairSummary.coverage ?? 0) * 100).toFixed(1)}% · Item CV{" "}
                      {((summary?.designDiagnostics?.itemSummary.cv ?? 0) * 100).toFixed(1)}%
                    </p>
                    {summary?.moneySignal && (
                      <>
                        <p className="text-muted-foreground">
                          Voucher best {(summary.moneySignal.voucherBestRate * 100).toFixed(1)}% · worst{" "}
                          {(summary.moneySignal.voucherWorstRate * 100).toFixed(1)}% · chosen{" "}
                          {(summary.moneySignal.voucherChosenRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-muted-foreground">
                          Voucher levels{" "}
                          {Object.entries(summary.moneySignal.voucherLevelCounts)
                            .map(([voucherId, count]) => `${voucherId}:${count}`)
                            .join(", ")}
                        </p>
                        <p className="text-muted-foreground">
                          Voucher exposure min {voucherExposureMin} · max {voucherExposureMax}
                        </p>
                      </>
                    )}
                    {stability && (
                      <p className="text-muted-foreground">
                        Stability{" "}
                        {stability.statusLabel === "pending"
                          ? "pending"
                          : stability.isStable
                            ? "pass"
                            : "not reached"}{" "}
                        · tasks {stability.tasksUsed}/{stability.maxTasks}
                      </p>
                    )}
                    {stability?.gates && stability.statusLabel === "pending" && (
                      <p className="text-muted-foreground">
                        Gates pending: {stability.gates.reasons.join(" ")}
                      </p>
                    )}
                    {summary?.calibration?.enabled && (
                      <p className="text-muted-foreground">
                        Calibration {summary.calibration.strategy} · scale {summary.calibration.scaleFactor.toFixed(3)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                      domain={[yAxisMin, yAxisMax]}
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
                const personaResults = displayedResults.get(persona) ?? [];
                return (
                  <div key={persona} className="space-y-2">
                    <h4 className="text-lg font-semibold">{persona}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead className="text-right">Material Cost</TableHead>
                          <TableHead className="text-right">Perceived / Adjusted WTP</TableHead>
                          <TableHead className="text-right">Raw Model WTP</TableHead>
                          <TableHead className="text-right">Utility</TableHead>
                          <TableHead className="text-right">95% CI</TableHead>
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
                                <TableCell className="text-right">
                                  {result.rawWtp != null ? `$${result.rawWtp.toFixed(2)}` : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {result.utility != null ? result.utility.toFixed(4) : result.netScore.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {result.ciLower95 != null && result.ciUpper95 != null
                                    ? `$${result.ciLower95.toFixed(2)} to $${result.ciUpper95.toFixed(2)}`
                                    : "—"}
                                </TableCell>
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
