import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle, AlertCircle, SlidersHorizontal, Users, Car, ListChecks, Cpu, Ticket, ReceiptText } from "lucide-react";
import { MaxDiffEngine, PerceivedValue, RawResponse } from "@/lib/maxdiff-engine";
import { buildSystemPrompt, buildUserPrompt, LLMClient } from "@/lib/llm-client";
import { usePersonas } from "@/personas/store";
import { useVehicles } from "@/vehicles/store";
import { ApiKeyInput } from "./ApiKeyInput";
import { DEFAULT_MODEL, DEFAULT_SERVICE_TIER, formatPrice, getStoredModelConfig, MODEL_PRICING } from "@/lib/model-pricing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { buildAnalysisCacheKey } from "@/lib/analysis-cache";
import type { MaxDiffCallLog } from "@/types/analysis";
import {
  ANALYSIS_SETTINGS_UPDATED_EVENT,
  getStoredAnalysisSettings,
  type AnalysisSettings,
} from "@/lib/analysis-settings";

interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

interface MaxDiffAnalysisProps {
  features: Feature[];
  selectedPersonas: string[];
  selectedVehicle: string;
  onAnalysisComplete: (results: Map<string, PerceivedValue[]>, callLogs: MaxDiffCallLog[]) => void;
  onEditAnalysisParameters?: () => void;
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const buildEngineFeatures = (items: Feature[]) => {
  const seenIds = new Set<string>();
  return items.map((feature, index) => {
    let baseId = (feature.id || feature.name.toLowerCase().replace(/\s+/g, '-'));
    baseId = baseId.replace(/[^a-z0-9-]/g, '').toLowerCase() || `feature-${index}`;
    let id = baseId;
    let suffix = 1;
    while (seenIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    seenIds.add(id);

    return {
      id,
      name: feature.name,
      description: feature.description,
      materialCost: feature.materialCost,
    };
  });
};

const buildAnalysisPlan = (
  engineFeatures: ReturnType<typeof buildEngineFeatures>,
  voucherBounds: { min_discount: number; max_discount: number; levels: number }
) => {
  const featureCosts = engineFeatures.map((feature) => feature.materialCost);
  const vouchers = MaxDiffEngine.generateVouchers(featureCosts, voucherBounds);
  const r = Math.max(3, Math.min(5, Math.ceil(engineFeatures.length / 5)));
  const maxDiffSets = MaxDiffEngine.generateMaxDiffSets(engineFeatures, vouchers, r);

  const featureDescMap = new Map<string, string>();
  engineFeatures.forEach((feature) => {
    featureDescMap.set(feature.id, feature.description);
  });
  vouchers.forEach((voucher) => {
    featureDescMap.set(voucher.id, voucher.description);
  });

  return {
    vouchers,
    maxDiffSets,
    featureDescMap,
  };
};

const buildFallbackRanking = (optionIds: string[]) => {
  const ranking = [...optionIds].sort(() => Math.random() - 0.5);
  return {
    ranking,
    mostValued: ranking[0],
    leastValued: ranking[ranking.length - 1],
  };
};

export const MaxDiffAnalysis = ({ features, selectedPersonas, selectedVehicle, onAnalysisComplete, onEditAnalysisParameters }: MaxDiffAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentPersona, setCurrentPersona] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [eta, setEta] = useState(0);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(() => getStoredAnalysisSettings());
  const [useCache, setUseCache] = useState(() => getStoredAnalysisSettings().defaultUseCache);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [serviceTier, setServiceTier] = useState(DEFAULT_SERVICE_TIER);
  const { toast } = useToast();

  const { personasById, getPersonaName } = usePersonas();
  const { vehiclesById } = useVehicles();

  const engineFeatures = useMemo(() => buildEngineFeatures(features), [features]);
  const voucherPolicyBounds = useMemo(
    () => MaxDiffEngine.deriveVoucherBounds(engineFeatures.map((feature) => feature.materialCost)),
    [engineFeatures]
  );
  const estimatedPlan = useMemo(
    () => buildAnalysisPlan(engineFeatures, voucherPolicyBounds),
    [engineFeatures, voucherPolicyBounds]
  );
  const totalSets = estimatedPlan.maxDiffSets.length;

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasApiKey(true);
    }
  }, []);

  useEffect(() => {
    const updateModelConfig = () => {
      const stored = getStoredModelConfig();
      setSelectedModel(stored.model);
      setServiceTier(stored.serviceTier);
    };

    const updateAnalysisSettings = () => {
      const stored = getStoredAnalysisSettings();
      setAnalysisSettings(stored);
      setUseCache(stored.defaultUseCache);
    };

    updateModelConfig();
    updateAnalysisSettings();
    window.addEventListener('model-config-updated', updateModelConfig);
    window.addEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, updateAnalysisSettings);
    window.addEventListener('storage', updateModelConfig);
    window.addEventListener('storage', updateAnalysisSettings);
    return () => {
      window.removeEventListener('model-config-updated', updateModelConfig);
      window.removeEventListener(ANALYSIS_SETTINGS_UPDATED_EVENT, updateAnalysisSettings);
      window.removeEventListener('storage', updateModelConfig);
      window.removeEventListener('storage', updateAnalysisSettings);
    };
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setHasApiKey(!!key);
  };

  const costEstimate = useMemo(() => {
    if (useCache) {
      return {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCalls: 0,
      };
    }

    const vehicle = vehiclesById[selectedVehicle];
    if (!vehicle) return null;

    const totalCalls = selectedPersonas.length * estimatedPlan.maxDiffSets.length;
    if (totalCalls === 0) return null;

    const sampleSet = estimatedPlan.maxDiffSets[0];
    if (!sampleSet) return null;

    const vehicleForAnalysis = {
      brand: vehicle.manufacturer || vehicle.name,
      name: vehicle.name,
    };

    const personaTokenCounts = selectedPersonas.map((personaId) => {
      const persona = personasById[personaId];
      return persona ? estimateTokens(buildSystemPrompt(persona)) : 0;
    });
    const avgSystemTokens = personaTokenCounts.length
      ? personaTokenCounts.reduce((sum, value) => sum + value, 0) / personaTokenCounts.length
      : 0;
    const userTokens = estimateTokens(buildUserPrompt(sampleSet, vehicleForAnalysis, estimatedPlan.featureDescMap));

    const perCallInputTokens = avgSystemTokens + userTokens;
    const perCallOutputTokens = 200;

    const inputTokens = Math.round(perCallInputTokens * totalCalls);
    const outputTokens = Math.round(perCallOutputTokens * totalCalls);

    const pricing = MODEL_PRICING[serviceTier][selectedModel];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      totalCost,
      inputCost,
      outputCost,
      inputTokens,
      outputTokens,
      totalCalls,
    };
  }, [
    estimatedPlan,
    personasById,
    selectedModel,
    selectedPersonas,
    selectedVehicle,
    serviceTier,
    useCache,
    vehiclesById,
  ]);

  // Defensive guards: ensure prerequisites are present to avoid runtime crashes
  if (!selectedVehicle || selectedPersonas.length === 0 || features.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Please select at least one persona, a vehicle, and upload features before running analysis.
        </p>
      </Card>
    );
  }

  const runAnalysis = async () => {
    if (!hasApiKey && !useCache) {
      setAnalysisStatus('API key required');
      toast({
        title: "API key required",
        description: "Add your OpenAI API key in Workspace → Configuration before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setCurrentSet(0);
    setElapsedTime(0);
    setEta(0);
    if (!analysisSettings.showProgressUpdates) {
      setAnalysisStatus('Running analysis...');
    }

    const startTime = Date.now();
    let callsDone = 0;

    try {
      const vehicle = vehiclesById[selectedVehicle];
      if (!vehicle) {
        throw new Error(`Invalid vehicle ${selectedVehicle}`);
      }

      const storedModelConfig = getStoredModelConfig();
      setSelectedModel(storedModelConfig.model);
      setServiceTier(storedModelConfig.serviceTier);

      const cacheKeyByPersona = new Map(
        selectedPersonas.map((personaId) => [
          personaId,
          buildAnalysisCacheKey({
            vehicleId: selectedVehicle,
            personaId,
            model: storedModelConfig.model,
            serviceTier: storedModelConfig.serviceTier,
            features: engineFeatures,
          }),
        ])
      );

      if (useCache) {
        const cachedResults = new Map<string, PerceivedValue[]>();
        const missingPersonas: string[] = [];

        for (const personaId of selectedPersonas) {
          const cacheKey = cacheKeyByPersona.get(personaId);
          const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
          if (!cached) {
            missingPersonas.push(getPersonaName(personaId));
            continue;
          }
          try {
            cachedResults.set(personaId, JSON.parse(cached));
          } catch {
            missingPersonas.push(getPersonaName(personaId));
          }
        }

        if (missingPersonas.length > 0) {
          throw new Error(`Cached results not found for: ${missingPersonas.join(', ')}`);
        }

        onAnalysisComplete(cachedResults, []);
        setAnalysisStatus('Loaded cached results.');
        setProgress(100);
        return;
      }

      const callLogs: MaxDiffCallLog[] = [];
      const results = new Map<string, PerceivedValue[]>();

      const llmClient = new LLMClient({
        apiKey,
        model: storedModelConfig.model,
        reasoningModel: storedModelConfig.model,
        serviceTier: storedModelConfig.serviceTier,
        maxRetries: analysisSettings.maxRetries,
        useGPT: true,
        temperature: analysisSettings.temperature,
      });

      const voucherBounds = voucherPolicyBounds;
      const analysisPlan = buildAnalysisPlan(engineFeatures, voucherBounds);
      const totalCalls = selectedPersonas.length * analysisPlan.maxDiffSets.length;

      if (totalCalls === 0 || analysisPlan.maxDiffSets.length === 0) {
        throw new Error('No analysis sets could be generated from current features.');
      }

      const updateTiming = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const avgPerCall = callsDone > 0 ? elapsed / callsDone : 0;
        const remaining = Math.max(0, totalCalls - callsDone);
        setElapsedTime(Math.floor(elapsed));
        setEta(Math.floor(avgPerCall * remaining));
        setProgress((callsDone / totalCalls) * 100);
      };

      const vehicleForAnalysis = {
        brand: vehicle.manufacturer || vehicle.name,
        name: vehicle.name,
      };

      for (const personaId of selectedPersonas) {
        setCurrentPersona(getPersonaName(personaId));

        const persona = personasById[personaId];
        if (!persona) {
          throw new Error(`Invalid persona ${personaId}`);
        }

        if (analysisSettings.showProgressUpdates) {
          setAnalysisStatus(`Starting analysis for ${personaId}...`);
        }
        const responses: RawResponse[] = [];

        for (let index = 0; index < analysisPlan.maxDiffSets.length; index++) {
          const maxDiffSet = analysisPlan.maxDiffSets[index];
          setCurrentSet(index + 1);
          if (analysisSettings.showProgressUpdates) {
            setAnalysisStatus(`${personaId}: Analyzing set ${index + 1}/${analysisPlan.maxDiffSets.length}`);
          }

          try {
            const timestamp = new Date().toISOString();
            const displayedFeatures = maxDiffSet.options.map((option) => option.name);
            const optionNameById = new Map(maxDiffSet.options.map((option) => [option.id, option.name]));

            const response = await llmClient.rankOptions(
              maxDiffSet,
              persona,
              vehicleForAnalysis,
              analysisPlan.featureDescMap
            );

            responses.push(response);
            callLogs.push({
              timestamp,
              displayedFeatures,
              mostValued: optionNameById.get(response.mostValued) ?? response.mostValued,
              leastValued: optionNameById.get(response.leastValued) ?? response.leastValued,
            });
          } catch (error) {
            console.error(`Error processing set ${index + 1}:`, error);
            const optionIds = maxDiffSet.options.map((option) => option.id);
            const fallback = buildFallbackRanking(optionIds);
            const timestamp = new Date().toISOString();
            const optionNameById = new Map(maxDiffSet.options.map((option) => [option.id, option.name]));

            responses.push({
              setId: maxDiffSet.id,
              personaId: persona.id,
              mostValued: fallback.mostValued,
              leastValued: fallback.leastValued,
              ranking: fallback.ranking,
            });

            callLogs.push({
              timestamp,
              displayedFeatures: maxDiffSet.options.map((option) => option.name),
              mostValued: optionNameById.get(fallback.mostValued) ?? fallback.mostValued,
              leastValued: optionNameById.get(fallback.leastValued) ?? fallback.leastValued,
            });
          }

          callsDone++;
          updateTiming();

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const perceivedValues = MaxDiffEngine.computePerceivedValues(
          responses,
          engineFeatures,
          analysisPlan.vouchers
        );

        results.set(personaId, perceivedValues);

        const cacheKey = cacheKeyByPersona.get(personaId);
        if (analysisSettings.persistResults && cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(perceivedValues));
        }
      }

      onAnalysisComplete(results, callLogs);
      setAnalysisStatus('Analysis complete!');
      setProgress(100);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisStatus(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
      setCurrentPersona('');
      setElapsedTime(0);
      setEta(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">MaxDiff Tradeoff Analysis</h2>
        <p className="text-muted-foreground">AI-powered persona simulation for feature valuation</p>
      </div>

      {!hasApiKey && !useCache && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API key required</AlertTitle>
          <AlertDescription>
            Add your OpenAI API key in Workspace → Configuration to run MaxDiff analysis.
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Analysis Setup
            </CardTitle>
            {onEditAnalysisParameters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onEditAnalysisParameters}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Edit analysis parameters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Personas
              </p>
              <p className="text-sm font-semibold">{selectedPersonas.length} selected</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedPersonas.map(getPersonaName).slice(0, 2).join(", ")}
                {selectedPersonas.length > 2 ? ` +${selectedPersonas.length - 2}` : ""}
              </p>
            </div>

            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
                Vehicle
              </p>
              <p className="truncate text-sm font-semibold">{vehiclesById[selectedVehicle]?.name ?? selectedVehicle}</p>
            </div>

            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                Features
              </p>
              <p className="text-sm font-semibold">{features.length} loaded</p>
            </div>

            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                Model
              </p>
              <p className="truncate text-sm font-semibold">{selectedModel}</p>
              <p className="text-xs text-muted-foreground">{serviceTier === 'flex' ? 'Flex tier' : 'Standard tier'}</p>
            </div>

            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" />
                Vouchers
              </p>
              <p className="text-sm font-semibold">{voucherPolicyBounds.levels} levels</p>
              <p className="text-xs text-muted-foreground">Low ${voucherPolicyBounds.min_discount} · High ${voucherPolicyBounds.max_discount}</p>
            </div>

            <div className="rounded-lg border bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/30">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" />
                Cost
              </p>
              <p className="text-sm font-semibold">{costEstimate ? (useCache ? '$0.00' : formatPrice(costEstimate.totalCost)) : '—'}</p>
              {costEstimate && !useCache && (
                <p className="text-xs text-muted-foreground">~{costEstimate.totalCalls} calls</p>
              )}
              {useCache && (
                <p className="text-xs text-muted-foreground">Cache enabled</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2 justify-center">
        <input
          type="checkbox"
          id="useCache"
          checked={useCache}
          onChange={(e) => setUseCache(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="useCache" className="text-sm text-muted-foreground">
          Use cached results (skip AI analysis)
        </label>
      </div>

      {!hasApiKey && !useCache ? (
        <ApiKeyInput onApiKeySet={handleApiKeySet} hasApiKey={hasApiKey} />
      ) : !isAnalyzing ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Ready to Analyze</CardTitle>
            <CardDescription>
              Start the MaxDiff analysis with {totalSets} feature sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runAnalysis}
              size="lg"
              variant="analytics"
              className="px-8"
            >
              <Brain className="h-5 w-5 mr-2" />
              Start MaxDiff Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 animate-pulse text-primary" />
              Analysis in Progress
            </CardTitle>
            <CardDescription>
              {analysisSettings.showProgressUpdates
                ? 'AI persona is evaluating feature sets...'
                : 'Analysis is running with compact progress updates.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {analysisSettings.showProgressUpdates && currentPersona && (
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Analyzing: <strong>{currentPersona}</strong></p>
              </div>
            )}

            <div className="text-center">
              {analysisSettings.showProgressUpdates && (
                <p className="text-sm font-medium mb-1">Current Set: {currentSet}</p>
              )}
              <p className="text-sm text-muted-foreground">{analysisStatus}</p>
            </div>

            {analysisSettings.showProgressUpdates && (
              <div className="text-center text-xs text-muted-foreground">
                ⏱ Elapsed: <strong>{Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</strong> ·
                ETA: <strong>{Math.floor(eta / 60)}m {eta % 60}s</strong>
              </div>
            )}

            {progress === 100 && (
              <div className="text-center pt-2">
                <CheckCircle className="h-8 w-8 text-data-positive mx-auto mb-2" />
                <p className="text-sm font-medium text-data-positive">Analysis Complete!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
