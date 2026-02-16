import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculateOptimalSets } from "@/lib/design-parameters";
import { ModelSettings } from "@/components/ModelSettings";
import {
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
                For GPT-5 models, unsupported values are automatically omitted by the client.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="rounded-md bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium">Voucher spacing policy</p>
                <p className="text-xs text-muted-foreground">
                  Vouchers use fixed policy bounds: min $1, max 1.2× highest feature cost, levels floor(features/3.5),
                  geometric spacing.
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
                <Badge variant={designParams.efficiency > 0.8 ? "default" : "outline"} className="text-xs">
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
