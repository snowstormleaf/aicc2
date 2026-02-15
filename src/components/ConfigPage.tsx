import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ApiKeyInput } from './ApiKeyInput';
import {
  analysisRetryOptions,
  analysisTemperatureOptions,
  ANALYSIS_SETTINGS_UPDATED_EVENT,
  getStoredAnalysisSettings,
  saveAnalysisSettings,
  type AnalysisSettings,
} from '@/lib/analysis-settings';
import { runSetupHealthChecks, type SetupHealthResult } from '@/lib/setup-health';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Brain,
  Key,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react';

interface ConfigPageProps {
  onClose?: () => void;
}

export const ConfigPage = ({ onClose }: ConfigPageProps) => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(getStoredAnalysisSettings());
  const [healthResult, setHealthResult] = useState<SetupHealthResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const refreshSetupStatus = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const result = await runSetupHealthChecks();
      setHealthResult(result);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    setHasApiKey(!!localStorage.getItem('openai_api_key')?.trim());
    setAnalysisSettings(getStoredAnalysisSettings());
    refreshSetupStatus();
  }, [refreshSetupStatus]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || ['openai_api_key', 'openai_model', 'openai_service_tier', 'analysis_settings'].includes(event.key)) {
        setHasApiKey(!!localStorage.getItem('openai_api_key')?.trim());
        setAnalysisSettings(getStoredAnalysisSettings());
        refreshSetupStatus();
      }
    };

    const handleModelUpdate = () => refreshSetupStatus();
    const handleAnalysisUpdate = () => {
      setAnalysisSettings(getStoredAnalysisSettings());
      refreshSetupStatus();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('model-config-updated', handleModelUpdate);
    window.addEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, handleAnalysisUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('model-config-updated', handleModelUpdate);
      window.removeEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, handleAnalysisUpdate);
    };
  }, [refreshSetupStatus]);

  const handleApiKeySet = (apiKey: string) => {
    const isPresent = Boolean(apiKey?.trim());
    setHasApiKey(isPresent);
    refreshSetupStatus();
  };

  const updateAnalysisSettings = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    const next = saveAnalysisSettings({ [key]: value });
    setAnalysisSettings(next);
  };

  const checksById = useMemo(
    () =>
      new Map(
        (healthResult?.checks ?? []).map((check) => [check.id, check])
      ),
    [healthResult]
  );

  const configSections = [
    {
      id: 'api',
      title: 'OpenAI API Configuration',
      description: 'Set up your OpenAI API key for AI persona analysis',
      icon: Key,
      status: hasApiKey ? 'configured' : 'required',
      component: <ApiKeyInput onApiKeySet={handleApiKeySet} hasApiKey={hasApiKey} />,
    },
    {
      id: 'analysis',
      title: 'Analysis Settings',
      description: 'Configure retries, temperature, caching, and runtime behavior',
      icon: Brain,
      status: 'configured',
      component: (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="analysis-retries">Retry attempts</Label>
              <Select
                value={String(analysisSettings.maxRetries)}
                onValueChange={(value) => updateAnalysisSettings('maxRetries', Number(value))}
              >
                <SelectTrigger id="analysis-retries">
                  <SelectValue placeholder="Select retries" />
                </SelectTrigger>
                <SelectContent>
                  {analysisRetryOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {value === 1 ? 'retry' : 'retries'}
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
                onValueChange={(value) => updateAnalysisSettings('temperature', Number(value))}
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
                  Vouchers use fixed policy bounds: min $1, max 1.2× highest feature cost, levels floor(features/3.5), geometric spacing.
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
                onCheckedChange={(checked) => updateAnalysisSettings('persistResults', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Default to cached results</p>
                <p className="text-xs text-muted-foreground">Pre-enable "Use cached results" each time analysis step opens.</p>
              </div>
              <Switch
                checked={analysisSettings.defaultUseCache}
                onCheckedChange={(checked) => updateAnalysisSettings('defaultUseCache', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Detailed progress updates</p>
                <p className="text-xs text-muted-foreground">Show live set-by-set status during analysis execution.</p>
              </div>
              <Switch
                checked={analysisSettings.showProgressUpdates}
                onCheckedChange={(checked) => updateAnalysisSettings('showProgressUpdates', checked)}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'services',
      title: 'Backend & Data Services',
      description: 'Verify backend health and persona/vehicle service availability',
      icon: Server,
      status:
        checksById.get('backend-health')?.status === 'healthy' && checksById.get('data-services')?.status === 'healthy'
          ? 'configured'
          : 'required',
      component: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Backend health and data endpoint checks are included in Setup Status above.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshSetupStatus}
            disabled={isCheckingHealth}
          >
            {isCheckingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Re-run service checks
          </Button>
        </div>
      ),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'bg-data-positive';
      case 'required':
        return 'bg-data-negative';
      default:
        return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured':
        return 'Configured';
      case 'required':
        return 'Action required';
      default:
        return 'Optional';
    }
  };

  const getHealthBadgeStyle = (status: 'healthy' | 'warning' | 'error') => {
    if (status === 'healthy') return 'bg-data-positive/10 text-data-positive border-data-positive/20';
    if (status === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-data-negative/10 text-data-negative border-data-negative/20';
  };

  const getHealthStatusLabel = (status: 'healthy' | 'warning' | 'error') => {
    if (status === 'healthy') return 'Healthy';
    if (status === 'warning') return 'Needs review';
    return 'Action needed';
  };

  const isReadyForAnalysis = healthResult?.ready ?? hasApiKey;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Setup Status</CardTitle>
              <CardDescription>Live checks to confirm your environment is ready for analysis</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshSetupStatus} disabled={isCheckingHealth}>
              {isCheckingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Check now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {isReadyForAnalysis ? (
              <>
                <span className="text-sm font-medium">All systems are running smoothly</span>
                <Badge variant="outline" className="bg-data-positive/10 text-data-positive border-data-positive/20">
                  Ready to go
                </Badge>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">Setup requires attention</span>
                <Badge variant="outline" className="bg-data-negative/10 text-data-negative border-data-negative/20">
                  Action needed
                </Badge>
              </>
            )}
          </div>

          {healthResult?.checks?.length ? (
            <div className="space-y-2 rounded-md border p-3">
              {healthResult.checks.map((check) => (
                <div key={check.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                  <HoverCard openDelay={120}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex shrink-0 cursor-help items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getHealthBadgeStyle(check.status)}`}
                      >
                        {getHealthStatusLabel(check.status)}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent align="end" className="w-80">
                      <p className="text-sm font-medium mb-1">{check.label}</p>
                      <p className="text-xs text-muted-foreground mb-2">{check.detail}</p>
                      <p className="text-xs">{check.guidance}</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No health checks completed yet.</p>
          )}

          {healthResult?.checkedAt && (
            <p className="text-xs text-muted-foreground">Last checked: {new Date(healthResult.checkedAt).toLocaleTimeString()}</p>
          )}
        </CardContent>
      </Card>

      {configSections.map((section, index) => {
        const Icon = section.icon;
        return (
          <div key={section.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg ${getStatusColor(section.status)} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      section.status === 'configured'
                        ? 'bg-data-positive/10 text-data-positive border-data-positive/20'
                        : section.status === 'required'
                        ? 'bg-data-negative/10 text-data-negative border-data-negative/20'
                        : ''
                    }`}
                  >
                    {getStatusText(section.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>{section.component}</CardContent>
            </Card>

            {index < configSections.length - 1 && <Separator className="my-4" />}
          </div>
        );
      })}

      {onClose && (
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="analytics" disabled={!isReadyForAnalysis}>
            {isReadyForAnalysis ? 'Start Analysis' : 'Resolve Setup Issues First'}
          </Button>
        </div>
      )}
    </div>
  );
};
