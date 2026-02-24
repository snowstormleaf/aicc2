import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculateOptimalSets } from "@/lib/design-parameters";
import { ModelSettings } from "@/components/ModelSettings";
import {
  analysisCalibrationStrategyOptions,
  analysisDesignModeOptions,
  analysisEstimatorOptions,
  analysisMoneyTransformOptions,
  analysisRetryOptions,
  analysisTemperatureOptions,
  ANALYSIS_SETTINGS_UPDATED_EVENT,
  getStoredAnalysisSettings,
  saveAnalysisSettings,
  type AnalysisSettings,
} from "@/lib/analysis-settings";

interface DesignParametersPanelProps {
  featureCount: number;
}

export const DesignParametersPanel = ({ featureCount }: DesignParametersPanelProps) => {
  const designParams = calculateOptimalSets(featureCount);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(getStoredAnalysisSettings());
  const bootstrapOptions = [50, 100, 200, 400, 800];
  const stabilityPercentOptions = [3, 5, 8, 10, 15];
  const topNOptions = [3, 5, 8, 10];
  const batchSizeOptions = [5, 10, 15, 20];
  const maxTasksOptions = [40, 60, 80, 120, 160];
  const featureExposureOptions = [8, 10, 12, 15, 18];
  const voucherExposureOptions = [6, 8, 10, 12, 15];
  const minRepeatTaskOptions = [4, 6, 8, 10, 12];
  const calibrationFeatureOptions = [3, 5, 7, 10];
  const calibrationStepOptions = [5, 7, 9, 11];

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "analysis_settings") {
        setAnalysisSettings(getStoredAnalysisSettings());
      }
    };

    const handleAnalysisUpdate = () => {
      setAnalysisSettings(getStoredAnalysisSettings());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, handleAnalysisUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, handleAnalysisUpdate);
    };
  }, []);

  const updateAnalysisSettings = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    const next = saveAnalysisSettings({ [key]: value });
    setAnalysisSettings(next);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis parameters</CardTitle>
          <CardDescription>Model and service settings used for analysis calls</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Settings</CardTitle>
          <CardDescription>Configure retries, temperature, caching, and runtime behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="analysis-retries">Retry attempts</Label>
              <Select
                value={String(analysisSettings.maxRetries)}
                onValueChange={(value) => updateAnalysisSettings("maxRetries", Number(value))}
              >
                <SelectTrigger id="analysis-retries">
                  <SelectValue placeholder="Select retries" />
                </SelectTrigger>
                <SelectContent>
                  {analysisRetryOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {value === 1 ? "retry" : "retries"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for each OpenAI ranking call.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-temperature">Temperature</Label>
              <Select
                value={String(analysisSettings.temperature)}
                onValueChange={(value) => updateAnalysisSettings("temperature", Number(value))}
              >
                <SelectTrigger id="analysis-temperature">
                  <SelectValue placeholder="Select temperature" />
                </SelectTrigger>
                <SelectContent>
                  {analysisTemperatureOptions.map((item) => (
                    <SelectItem key={item.value} value={String(item.value)}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set to 0 for deterministic repeatability.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="analysis-design-mode">Design mode</Label>
              <Select
                value={analysisSettings.designMode}
                onValueChange={(value) => updateAnalysisSettings("designMode", value as AnalysisSettings["designMode"])}
              >
                <SelectTrigger id="analysis-design-mode">
                  <SelectValue placeholder="Select design mode" />
                </SelectTrigger>
                <SelectContent>
                  {analysisDesignModeOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-estimator">Estimator</Label>
              <Select
                value={analysisSettings.estimator}
                onValueChange={(value) => updateAnalysisSettings("estimator", value as AnalysisSettings["estimator"])}
              >
                <SelectTrigger id="analysis-estimator">
                  <SelectValue placeholder="Select estimator" />
                </SelectTrigger>
                <SelectContent>
                  {analysisEstimatorOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-money-transform">Money transform</Label>
              <Select
                value={analysisSettings.moneyTransform}
                onValueChange={(value) => updateAnalysisSettings("moneyTransform", value as AnalysisSettings["moneyTransform"])}
              >
                <SelectTrigger id="analysis-money-transform">
                  <SelectValue placeholder="Select transform" />
                </SelectTrigger>
                <SelectContent>
                  {analysisMoneyTransformOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-bootstrap">Bootstrap samples</Label>
              <Select
                value={String(analysisSettings.bootstrapSamples)}
                onValueChange={(value) => updateAnalysisSettings("bootstrapSamples", Number(value))}
              >
                <SelectTrigger id="analysis-bootstrap">
                  <SelectValue placeholder="Select samples" />
                </SelectTrigger>
                <SelectContent>
                  {bootstrapOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-seed">Design seed</Label>
              <Select
                value={String(analysisSettings.designSeed)}
                onValueChange={(value) => updateAnalysisSettings("designSeed", Number(value))}
              >
                <SelectTrigger id="analysis-seed">
                  <SelectValue placeholder="Select seed" />
                </SelectTrigger>
                <SelectContent>
                  {[42, 101, 313, 777, 2026].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-repeat-fraction">Repeat task fraction</Label>
              <Select
                value={String(analysisSettings.repeatTaskFraction)}
                onValueChange={(value) => updateAnalysisSettings("repeatTaskFraction", Number(value))}
              >
                <SelectTrigger id="analysis-repeat-fraction">
                  <SelectValue placeholder="Select repeat share" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 0.05, 0.1, 0.15, 0.2].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {(value * 100).toFixed(0)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-target-feature-exposures">Target feature exposures</Label>
              <Select
                value={String(analysisSettings.targetFeatureExposures)}
                onValueChange={(value) => updateAnalysisSettings("targetFeatureExposures", Number(value))}
              >
                <SelectTrigger id="analysis-target-feature-exposures">
                  <SelectValue placeholder="Select feature exposures" />
                </SelectTrigger>
                <SelectContent>
                  {featureExposureOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Minimum appearances required per feature.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-target-voucher-exposures">Target voucher exposures</Label>
              <Select
                value={String(analysisSettings.targetVoucherExposuresPerLevel)}
                onValueChange={(value) => updateAnalysisSettings("targetVoucherExposuresPerLevel", Number(value))}
              >
                <SelectTrigger id="analysis-target-voucher-exposures">
                  <SelectValue placeholder="Select voucher exposures" />
                </SelectTrigger>
                <SelectContent>
                  {voucherExposureOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Minimum appearances required for each voucher level.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-min-repeat-tasks">Minimum repeat tasks</Label>
              <Select
                value={String(analysisSettings.minRepeatTasks)}
                onValueChange={(value) => updateAnalysisSettings("minRepeatTasks", Number(value))}
              >
                <SelectTrigger id="analysis-min-repeat-tasks">
                  <SelectValue placeholder="Select minimum repeats" />
                </SelectTrigger>
                <SelectContent>
                  {minRepeatTaskOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Required answered repeat pairs before stability pass.</p>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border-subtle bg-muted/10 p-3">
            <div className="rounded-md bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium">Voucher spacing policy</p>
                <p className="text-xs text-muted-foreground">
                  Vouchers use fixed policy bounds: min $0, max 1.2× highest feature cost, 7 levels by default, log
                  spacing in log1p-space, and exactly 1 voucher per task.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Persist analysis results</p>
                <p className="text-xs text-muted-foreground">Save per-persona results into browser cache after completion.</p>
              </div>
              <Switch
                checked={analysisSettings.persistResults}
                onCheckedChange={(checked) => updateAnalysisSettings("persistResults", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Default to cached results</p>
                <p className="text-xs text-muted-foreground">Pre-enable "Use cached results" each time analysis step opens.</p>
              </div>
              <Switch
                checked={analysisSettings.defaultUseCache}
                onCheckedChange={(checked) => updateAnalysisSettings("defaultUseCache", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Simulate API calls (testing)</p>
                <p className="text-xs text-muted-foreground">
                  Generate random ranking responses with realistic call timing, without sending real OpenAI requests.
                </p>
              </div>
              <Switch
                checked={analysisSettings.simulateApiCalls}
                onCheckedChange={(checked) => updateAnalysisSettings("simulateApiCalls", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Detailed progress updates</p>
                <p className="text-xs text-muted-foreground">Show live set-by-set status during analysis execution.</p>
              </div>
              <Switch
                checked={analysisSettings.showProgressUpdates}
                onCheckedChange={(checked) => updateAnalysisSettings("showProgressUpdates", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Stabilize to target CI width</p>
                <p className="text-xs text-muted-foreground">
                  Automatically add task batches until top-feature uncertainty target is reached or max tasks is hit.
                </p>
              </div>
              <Switch
                checked={analysisSettings.stabilizeToTarget}
                onCheckedChange={(checked) => updateAnalysisSettings("stabilizeToTarget", checked)}
              />
            </div>

            {analysisSettings.stabilizeToTarget && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="analysis-stability-target">Target ±%</Label>
                  <Select
                    value={String(analysisSettings.stabilityTargetPercent)}
                    onValueChange={(value) => updateAnalysisSettings("stabilityTargetPercent", Number(value))}
                  >
                    <SelectTrigger id="analysis-stability-target">
                      <SelectValue placeholder="Select target %" />
                    </SelectTrigger>
                    <SelectContent>
                      {stabilityPercentOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          ±{value}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-stability-topn">Top N features</Label>
                  <Select
                    value={String(analysisSettings.stabilityTopN)}
                    onValueChange={(value) => updateAnalysisSettings("stabilityTopN", Number(value))}
                  >
                    <SelectTrigger id="analysis-stability-topn">
                      <SelectValue placeholder="Select top N" />
                    </SelectTrigger>
                    <SelectContent>
                      {topNOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-stability-batch">Batch size</Label>
                  <Select
                    value={String(analysisSettings.stabilityBatchSize)}
                    onValueChange={(value) => updateAnalysisSettings("stabilityBatchSize", Number(value))}
                  >
                    <SelectTrigger id="analysis-stability-batch">
                      <SelectValue placeholder="Select batch size" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchSizeOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-stability-max">Max tasks</Label>
                  <Select
                    value={String(analysisSettings.stabilityMaxTasks)}
                    onValueChange={(value) => updateAnalysisSettings("stabilityMaxTasks", Number(value))}
                  >
                    <SelectTrigger id="analysis-stability-max">
                      <SelectValue placeholder="Select max tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      {maxTasksOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Enable calibration layer</p>
                <p className="text-xs text-muted-foreground">
                  Run feature-vs-cash indifference search and apply WTP correction.
                </p>
              </div>
              <Switch
                checked={analysisSettings.enableCalibration}
                onCheckedChange={(checked) => updateAnalysisSettings("enableCalibration", checked)}
              />
            </div>

            {analysisSettings.enableCalibration && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="analysis-calibration-count">Features to calibrate</Label>
                  <Select
                    value={String(analysisSettings.calibrationFeatureCount)}
                    onValueChange={(value) => updateAnalysisSettings("calibrationFeatureCount", Number(value))}
                  >
                    <SelectTrigger id="analysis-calibration-count">
                      <SelectValue placeholder="Select feature count" />
                    </SelectTrigger>
                    <SelectContent>
                      {calibrationFeatureOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-calibration-steps">Steps per feature</Label>
                  <Select
                    value={String(analysisSettings.calibrationSteps)}
                    onValueChange={(value) => updateAnalysisSettings("calibrationSteps", Number(value))}
                  >
                    <SelectTrigger id="analysis-calibration-steps">
                      <SelectValue placeholder="Select steps" />
                    </SelectTrigger>
                    <SelectContent>
                      {calibrationStepOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-calibration-strategy">Adjustment strategy</Label>
                  <Select
                    value={analysisSettings.calibrationStrategy}
                    onValueChange={(value) =>
                      updateAnalysisSettings("calibrationStrategy", value as AnalysisSettings["calibrationStrategy"])
                    }
                  >
                    <SelectTrigger id="analysis-calibration-strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {analysisCalibrationStrategyOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Hide material cost</p>
                <p className="text-xs text-muted-foreground">
                  In View Results, show feature perceived-value bars instead of the material-cost scatter chart.
                </p>
              </div>
              <Switch
                checked={analysisSettings.hideMaterialCost}
                onCheckedChange={(checked) => updateAnalysisSettings("hideMaterialCost", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experiment Design (BIBD)</CardTitle>
          <CardDescription>Balanced Incomplete Block Design details for this session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {featureCount === 0 ? (
            <p className="text-muted-foreground">
              Upload features in the analysis workflow to see BIBD parameters.
            </p>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Features (t):</span>
                <span className="font-medium">{featureCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items per set (k):</span>
                <span className="font-medium">{designParams.itemsPerSet}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sets required (b):</span>
                <span className="font-medium">{designParams.sets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feature frequency (r):</span>
                <span className="font-medium">{designParams.r}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pair balance (λ):</span>
                <span className="font-medium">{designParams.lambda.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Design efficiency:</span>
                <Badge variant={designParams.efficiency > 0.8 ? "selected" : "outline"} className="text-xs">
                  {Math.round(designParams.efficiency * 100)}%
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
