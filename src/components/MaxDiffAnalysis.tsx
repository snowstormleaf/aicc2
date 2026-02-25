import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Brain,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  Users,
  Car,
  ListChecks,
  Cpu,
  Ticket,
  ReceiptText,
  TerminalSquare,
  Gauge,
} from "lucide-react";
import {
  MaxDiffEngine,
  MaxDiffSet,
  PerceivedValue,
  RawResponse,
  type CalibrationAdjustmentStrategy,
  type CalibrationResult,
  type MoneySignalDiagnostics,
  type PersonaAnalysisSummary,
  type StabilityGateStatus,
} from "@/lib/maxdiff-engine";
import { buildSystemPrompt, buildUserPrompt, LLMClient } from "@/lib/llm-client";
import { usePersonas } from "@/personas/store";
import { useVehicles } from "@/vehicles/store";
import { ApiKeyInput } from "./ApiKeyInput";
import { DEFAULT_MODEL, DEFAULT_SERVICE_TIER, formatPrice, getStoredModelConfig, MODEL_PRICING } from "@/lib/model-pricing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { buildAnalysisCacheKey, buildCalibrationCacheKey } from "@/lib/analysis-cache";
import type { MaxDiffCallLog, PersonaAnalysisResult } from "@/types/analysis";
import {
  ANALYSIS_SETTINGS_UPDATED_EVENT,
  getStoredAnalysisSettings,
  type AnalysisSettings,
} from "@/lib/analysis-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  bootstrapBwsMnlMoney,
  computeRepeatability,
  evaluateStabilityChecks,
  fitBwsMnlMoney,
  topFeaturesByWtp,
} from "@/domain/analysis/estimation/bwsMnl";
import { runFeatureCashCalibrationSearch } from "@/domain/analysis/calibration/featureCashCalibration";
import { wtpFromUtility } from "@/domain/analysis/wtp";
import {
  computeExposureTaskPlan,
  displayWtpFromRaw,
  evaluateStabilityGates,
} from "@/domain/analysis/stability";

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
  onAnalysisComplete: (
    results: Map<string, PerceivedValue[]>,
    callLogs: MaxDiffCallLog[],
    summaries: Map<string, PersonaAnalysisSummary>
  ) => void;
  onEditAnalysisParameters?: () => void;
}

type LiveCallCard = MaxDiffCallLog & {
  phase: 'active';
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const stringifyPayload = (value: unknown, maxChars = 12_000): string => {
  try {
    const json = JSON.stringify(value, null, 2);
    if (json.length <= maxChars) return json;
    return `${json.slice(0, maxChars)}\n...truncated`;
  } catch {
    return String(value);
  }
};

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const DEFAULT_MONEY_SCALE = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const median = (values: number[]) => {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const simulateRankOptions = async (
  set: MaxDiffSet,
  personaId: string,
  requestPreview: Record<string, unknown>
): Promise<RawResponse> => {
  const optionIds = set.options.map((option) => option.id);
  const ranking = shuffle(optionIds);
  const mostValued = ranking[0] ?? optionIds[0] ?? "unknown";
  const leastValued = ranking[ranking.length - 1] ?? optionIds[optionIds.length - 1] ?? "unknown";

  await sleep(180 + Math.floor(Math.random() * 420));

  return {
    setId: set.id,
    personaId,
    mostValued,
    leastValued,
    ranking,
    debugTrace: {
      request: {
        ...requestPreview,
        mode: "simulated",
      },
      response: {
        mode: "simulated",
        ranking,
        most_valued: mostValued,
        least_valued: leastValued,
      },
    },
  };
};

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
  voucherBounds: { min_discount: number; max_discount: number; levels: number; spacing?: "log" | "linear"; include_zero?: boolean },
  settings: AnalysisSettings
) => {
  const featureCosts = engineFeatures.map((feature) => feature.materialCost);
  const vouchers = MaxDiffEngine.generateVouchers(featureCosts, voucherBounds);
  const exposurePlan = computeExposureTaskPlan({
    featureCount: engineFeatures.length,
    voucherLevelCount: vouchers.length,
    targetFeatureExposures: settings.targetFeatureExposures,
    targetVoucherExposuresPerLevel: settings.targetVoucherExposuresPerLevel,
    repeatFraction: settings.repeatTaskFraction,
    featuresPerTask: 3,
    minTasksFloor: 60,
    maxTasksCap: settings.stabilizeToTarget ? settings.stabilityMaxTasks : undefined,
  });
  const r = Math.max(1, exposurePlan.recommendedRTarget);
  const generated = MaxDiffEngine.generateMaxDiffPlan(engineFeatures, vouchers, {
    r,
    itemsPerSet: 4,
    designMode: settings.designMode,
    seed: settings.designSeed,
    repeatFraction: settings.repeatTaskFraction,
    improvementIterations: 800,
  });

  const featureDescMap = new Map<string, string>();
  engineFeatures.forEach((feature) => {
    featureDescMap.set(feature.id, feature.description);
  });
  vouchers.forEach((voucher) => {
    featureDescMap.set(voucher.id, voucher.description);
  });

  return {
    vouchers,
    maxDiffSets: generated.maxDiffSets,
    designDiagnostics: generated.diagnostics,
    designMode: generated.designMode,
    r,
    itemsPerSet: 4,
    featureDescMap,
    exposurePlan,
  };
};

const buildAnalysisConfigFingerprint = (settings: AnalysisSettings) =>
  [
    settings.designMode,
    settings.estimator,
    settings.moneyTransform,
    settings.designSeed,
    settings.repeatTaskFraction,
    settings.bootstrapSamples,
    settings.stabilizeToTarget,
    settings.stabilityTargetPercent,
    settings.stabilityTopN,
    settings.stabilityBatchSize,
    settings.stabilityMaxTasks,
    settings.targetFeatureExposures,
    settings.targetVoucherExposuresPerLevel,
    settings.minRepeatTasks,
    settings.enableCalibration,
    settings.calibrationFeatureCount,
    settings.calibrationSteps,
    settings.calibrationStrategy,
  ].join("|");

const formatAmountLabel = (amount: number) => `$${Number(amount.toFixed(2)).toLocaleString()}`;

const MAX_FAILURE_RATE_FOR_STABILITY = 0.02;
const MIN_REPEATABILITY_FOR_STABILITY = 0.8;

const buildExposureDiagnostics = (
  sets: MaxDiffSet[],
  responses: RawResponse[],
  featureIds: string[],
  vouchers: Array<{ id: string; amount: number }>
) => {
  const setById = new Map(sets.map((set) => [set.id, set]));
  const featureIdSet = new Set(featureIds);
  const voucherIdSet = new Set(vouchers.map((voucher) => voucher.id));
  const voucherAmountById = new Map(vouchers.map((voucher) => [voucher.id, voucher.amount]));
  const featureAppearances = new Map(featureIds.map((id) => [id, 0]));
  const voucherAppearances = new Map(vouchers.map((voucher) => [voucher.id, 0]));
  const validResponses = responses.filter((response) => !response.failed);
  let answeredTasks = 0;
  let voucherBestCount = 0;
  let voucherWorstCount = 0;

  validResponses.forEach((response) => {
    const set = setById.get(response.setId);
    if (!set) return;
    answeredTasks++;
    set.options.forEach((option) => {
      if (featureIdSet.has(option.id)) {
        featureAppearances.set(option.id, (featureAppearances.get(option.id) ?? 0) + 1);
      } else if (voucherIdSet.has(option.id)) {
        voucherAppearances.set(option.id, (voucherAppearances.get(option.id) ?? 0) + 1);
      }
    });
    if (voucherIdSet.has(response.mostValued)) voucherBestCount++;
    if (voucherIdSet.has(response.leastValued)) voucherWorstCount++;
  });

  const voucherChosenCount = voucherBestCount + voucherWorstCount;
  const denominator = Math.max(1, answeredTasks);
  const voucherLevelCounts: Record<string, number> = {};
  voucherAppearances.forEach((count, voucherId) => {
    const amount = voucherAmountById.get(voucherId) ?? 0;
    voucherLevelCounts[formatAmountLabel(amount)] = count;
  });

  const moneySignal: MoneySignalDiagnostics = {
    voucherBestCount,
    voucherWorstCount,
    voucherChosenCount,
    voucherBestRate: voucherBestCount / denominator,
    voucherWorstRate: voucherWorstCount / denominator,
    voucherChosenRate: voucherChosenCount / denominator,
    voucherLevelCounts,
  };

  return {
    answeredTasks,
    featureAppearances,
    voucherAppearances,
    moneySignal,
  };
};

export const MaxDiffAnalysis = ({ features, selectedPersonas, selectedVehicle, onAnalysisComplete, onEditAnalysisParameters }: MaxDiffAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentPersona, setCurrentPersona] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [eta, setEta] = useState(0);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(() => getStoredAnalysisSettings());
  const [useCache, setUseCache] = useState(() => getStoredAnalysisSettings().defaultUseCache);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [serviceTier, setServiceTier] = useState(DEFAULT_SERVICE_TIER);
  const [apiCallLogs, setApiCallLogs] = useState<MaxDiffCallLog[]>([]);
  const [liveCallCards, setLiveCallCards] = useState<LiveCallCard[]>([]);
  const [isApiConsoleOpen, setIsApiConsoleOpen] = useState(false);
  const { toast } = useToast();

  const { personasById, getPersonaName } = usePersonas();
  const { vehiclesById } = useVehicles();

  const engineFeatures = useMemo(() => buildEngineFeatures(features), [features]);
  const voucherPolicyBounds = useMemo(
    () => MaxDiffEngine.deriveVoucherBounds(engineFeatures.map((feature) => feature.materialCost)),
    [engineFeatures]
  );
  const estimatedPlan = useMemo(
    () => buildAnalysisPlan(engineFeatures, voucherPolicyBounds, analysisSettings),
    [analysisSettings, engineFeatures, voucherPolicyBounds]
  );
  const totalSets = estimatedPlan.maxDiffSets.length;

  const enqueueLiveCall = (entry: MaxDiffCallLog) => {
    setLiveCallCards((previous) => {
      const fresh: LiveCallCard = { ...entry, phase: 'active' };
      return [fresh, ...previous].slice(0, 4);
    });
  };

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

  const handleApiKeySet = (isPresent: boolean) => {
    setHasApiKey(isPresent);
  };

  const isSimulationMode = analysisSettings.simulateApiCalls;

  const costEstimate = useMemo(() => {
    const totalCalls = selectedPersonas.length * estimatedPlan.maxDiffSets.length;

    if (useCache || isSimulationMode) {
      return {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCalls,
      };
    }

    const vehicle = vehiclesById[selectedVehicle];
    if (!vehicle) return null;

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
    const samplePersona = selectedPersonas.map((id) => personasById[id]).find(Boolean);
    const userTokens = estimateTokens(buildUserPrompt(sampleSet, vehicleForAnalysis, estimatedPlan.featureDescMap, samplePersona ?? { id: 'buyer', name: 'buyer' }));

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
    isSimulationMode,
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
    if (!hasApiKey && !useCache && !isSimulationMode) {
      setAnalysisStatus('Server OpenAI key required');
      toast({
        title: "Server OpenAI key required",
        description: "Configure OPENAI_API_KEY on the backend (see Configuration) before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setCurrentSet(0);
    setElapsedTime(0);
    setEta(0);
    setApiCallLogs([]);
    setLiveCallCards([]);

    if (!analysisSettings.showProgressUpdates) {
      setAnalysisStatus(isSimulationMode ? 'Running simulated analysis...' : 'Running analysis...');
    }

    const startTime = Date.now();
    let callsDone = 0;
    let activeCallStartedAt: number | null = null;
    let totalCompletedCallSeconds = 0;
    let smoothedEta = 0;
    let timingIntervalId: number | null = null;

    try {
      const vehicle = vehiclesById[selectedVehicle];
      if (!vehicle) {
        throw new Error(`Invalid vehicle ${selectedVehicle}`);
      }

      const storedModelConfig = getStoredModelConfig();
      setSelectedModel(storedModelConfig.model);
      setServiceTier(storedModelConfig.serviceTier);
      const configFingerprint = buildAnalysisConfigFingerprint(analysisSettings);

      const cacheKeyByPersona = new Map(
        selectedPersonas.map((personaId) => [
          personaId,
          buildAnalysisCacheKey({
            vehicleId: selectedVehicle,
            personaId,
            model: storedModelConfig.model,
            serviceTier: storedModelConfig.serviceTier,
            features: engineFeatures,
            analysisConfigFingerprint: configFingerprint,
          }),
        ])
      );

      if (useCache) {
        const cachedResults = new Map<string, PerceivedValue[]>();
        const cachedSummaries = new Map<string, PersonaAnalysisSummary>();
        const missingPersonas: string[] = [];

        for (const personaId of selectedPersonas) {
          const personaName = getPersonaName(personaId);
          const resultKey = cachedResults.has(personaName) ? `${personaName} (${personaId})` : personaName;
          const cacheKey = cacheKeyByPersona.get(personaId);
          const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
          if (!cached) {
            missingPersonas.push(getPersonaName(personaId));
            continue;
          }
          try {
            const parsed = JSON.parse(cached) as PersonaAnalysisResult | PerceivedValue[];
            if (Array.isArray(parsed)) {
              cachedResults.set(resultKey, parsed);
              const fallbackSummary: PersonaAnalysisSummary = {
                designMode: analysisSettings.designMode,
                estimator: "legacy_score",
                moneyTransform: "log1p",
                beta: null,
                moneyScale: DEFAULT_MONEY_SCALE,
                designDiagnostics: estimatedPlan.designDiagnostics,
                repeatability: {
                  totalRepeatPairs: 0,
                  bestAgreementCount: 0,
                  worstAgreementCount: 0,
                  jointAgreementCount: 0,
                  bestAgreementRate: 0,
                  worstAgreementRate: 0,
                  jointAgreementRate: 0,
                },
                plannedTaskCount: 0,
                answeredTaskCount: 0,
                usedInFitTaskCount: 0,
                stopReason: "maxTasksReached",
                failedTaskCount: 0,
                totalTaskCount: 0,
                failureRate: 0,
                bootstrapSamples: 0,
                features: Object.fromEntries(
                  parsed.map((row) => [
                    row.featureId,
                    {
                      utility: row.netScore,
                      rawWtp: row.perceivedValue,
                      adjustedWtp: row.perceivedValue,
                      ciLower95: row.perceivedValue,
                      ciUpper95: row.perceivedValue,
                      adjustmentSource: "model" as const,
                    },
                  ])
                ),
              };
              cachedSummaries.set(resultKey, fallbackSummary);
              continue;
            }
            cachedResults.set(resultKey, parsed.perceivedValues ?? []);
            cachedSummaries.set(
              resultKey,
              parsed.summary ?? {
                designMode: analysisSettings.designMode,
                estimator: analysisSettings.estimator,
                moneyTransform: analysisSettings.moneyTransform,
                beta: null,
                designDiagnostics: estimatedPlan.designDiagnostics,
                repeatability: {
                  totalRepeatPairs: 0,
                  bestAgreementCount: 0,
                  worstAgreementCount: 0,
                  jointAgreementCount: 0,
                  bestAgreementRate: 0,
                  worstAgreementRate: 0,
                  jointAgreementRate: 0,
                },
                moneyScale: DEFAULT_MONEY_SCALE,
                failedTaskCount: 0,
                totalTaskCount: 0,
                failureRate: 0,
                bootstrapSamples: 0,
                features: {},
              }
            );
          } catch {
            missingPersonas.push(getPersonaName(personaId));
          }
        }

        if (missingPersonas.length > 0) {
          throw new Error(`Cached results not found for: ${missingPersonas.join(', ')}`);
        }

        onAnalysisComplete(cachedResults, [], cachedSummaries);
        setAnalysisStatus('Loaded cached results.');
        setProgress(100);
        return;
      }

      const callLogs: MaxDiffCallLog[] = [];
      const results = new Map<string, PerceivedValue[]>();
      const summaries = new Map<string, PersonaAnalysisSummary>();

      const upsertCallLog = (entry: MaxDiffCallLog, addToLiveWindow = false) => {
        const existingIndex = callLogs.findIndex((item) => item.id === entry.id);
        if (existingIndex >= 0) {
          callLogs[existingIndex] = entry;
        } else {
          callLogs.push(entry);
        }
        setApiCallLogs([...callLogs]);
        if (addToLiveWindow) {
          enqueueLiveCall(entry);
        }
      };

      const llmClient = isSimulationMode
        ? null
        : new LLMClient({
            model: storedModelConfig.model,
            reasoningModel: storedModelConfig.model,
            serviceTier: storedModelConfig.serviceTier,
            maxRetries: analysisSettings.maxRetries,
            useGPT: true,
            temperature: 0,
          });

      const voucherBounds = voucherPolicyBounds;
      const analysisPlan = buildAnalysisPlan(engineFeatures, voucherBounds, analysisSettings);
      const projectedSetsPerPersona = analysisSettings.stabilizeToTarget
        ? Math.max(analysisPlan.maxDiffSets.length, analysisSettings.stabilityMaxTasks)
        : analysisPlan.maxDiffSets.length;
      const totalCalls = selectedPersonas.length * projectedSetsPerPersona;

      if (totalCalls === 0 || analysisPlan.maxDiffSets.length === 0) {
        throw new Error('No analysis sets could be generated from current features.');
      }

      const updateTiming = () => {
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        const avgPerCall = callsDone > 0 ? totalCompletedCallSeconds / callsDone : 2.5;
        const inFlightSeconds = activeCallStartedAt ? (now - activeCallStartedAt) / 1000 : 0;
        const inFlightProgress = activeCallStartedAt
          ? Math.min(0.95, inFlightSeconds / Math.max(avgPerCall, 0.25))
          : 0;
        const completedEquivalent = callsDone + inFlightProgress;
        const remainingCalls = Math.max(0, totalCalls - completedEquivalent);
        const currentEta = Math.round(remainingCalls * avgPerCall);
        smoothedEta = smoothedEta === 0 ? currentEta : Math.round(smoothedEta * 0.75 + currentEta * 0.25);

        setElapsedTime(Math.max(0, Math.round(elapsedSeconds)));
        setEta(Math.max(0, smoothedEta));
        setProgress(Math.min(100, (completedEquivalent / totalCalls) * 100));
      };

      updateTiming();
      timingIntervalId = window.setInterval(updateTiming, 250);

      const vehicleForAnalysis = {
        brand: vehicle.manufacturer || vehicle.name,
        name: vehicle.name,
        description: vehicle.description ?? undefined,
      };

      for (const personaId of selectedPersonas) {
        const personaName = getPersonaName(personaId);
        setCurrentPersona(personaName);

        const persona = personasById[personaId];
        if (!persona) {
          throw new Error(`Invalid persona ${personaId}`);
        }

        if (analysisSettings.showProgressUpdates) {
          setAnalysisStatus(`${isSimulationMode ? 'Starting simulation' : 'Starting analysis'} for ${personaName}...`);
        }
        const responses: RawResponse[] = [];
        let personaSets = [...analysisPlan.maxDiffSets];
        let designDiagnostics = analysisPlan.designDiagnostics;
        let batchesAdded = 0;

        const runSingleSet = async (maxDiffSet: MaxDiffSet, index: number, setCount: number) => {
          setCurrentSet(index + 1);
          if (analysisSettings.showProgressUpdates) {
            setAnalysisStatus(
              `${personaName}: ${isSimulationMode ? 'Simulating' : 'Analyzing'} set ${index + 1}/${setCount}`
            );
          }

          const timestamp = new Date().toISOString();
          const displayedFeatures = maxDiffSet.options.map((option) => option.name);
          const optionNameById = new Map(maxDiffSet.options.map((option) => [option.id, option.name]));
          const callId = `${personaId}-${maxDiffSet.id}-${index + 1}-${Date.now()}`;

          const requestPreview = {
            endpoint: 'POST /v1/responses',
            persona: personaName,
            setId: maxDiffSet.id,
            vehicle: vehicleForAnalysis,
            options: maxDiffSet.options.map((option) => ({
              id: option.id,
              name: option.name,
            })),
          };

          const pendingLog: MaxDiffCallLog = {
            id: callId,
            timestamp,
            personaId,
            personaName,
            setId: maxDiffSet.id,
            displayedFeatures,
            mostValued: 'Pending...',
            leastValued: 'Pending...',
            status: 'pending',
            request: stringifyPayload(requestPreview),
            response: '',
          };
          upsertCallLog(pendingLog);

          activeCallStartedAt = Date.now();
          updateTiming();

          let response: RawResponse;
          try {
            response = isSimulationMode
              ? await simulateRankOptions(maxDiffSet, persona.id, requestPreview)
              : await llmClient!.rankOptions(maxDiffSet, persona, vehicleForAnalysis, analysisPlan.featureDescMap);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            const failedLog: MaxDiffCallLog = {
              ...pendingLog,
              status: 'error',
              mostValued: '—',
              leastValued: '—',
              error: reason,
              response: reason,
            };
            upsertCallLog(failedLog, true);
            response = {
              setId: maxDiffSet.id,
              personaId: persona.id,
              mostValued: "",
              leastValued: "",
              ranking: [],
              failed: true,
              failureReason: reason,
              debugTrace: {
                request: requestPreview,
                response: { error: reason },
              },
            };
          }

          responses.push(response);
          const successLog: MaxDiffCallLog = response.failed
            ? {
                ...pendingLog,
                status: "error",
                mostValued: "—",
                leastValued: "—",
                error: response.failureReason ?? "Failed",
                request: stringifyPayload(response.debugTrace?.request ?? requestPreview),
                response: stringifyPayload(response.debugTrace?.response ?? response.failureReason ?? "Failed"),
              }
            : {
                ...pendingLog,
                mostValued: optionNameById.get(response.mostValued) ?? response.mostValued,
                leastValued: optionNameById.get(response.leastValued) ?? response.leastValued,
                status: "success",
                request: stringifyPayload(response.debugTrace?.request ?? requestPreview),
                response: stringifyPayload(response.debugTrace?.response ?? response),
              };
          upsertCallLog(successLog, true);

          if (activeCallStartedAt) {
            totalCompletedCallSeconds += Math.max(0.1, (Date.now() - activeCallStartedAt) / 1000);
            activeCallStartedAt = null;
          }
          callsDone++;
          updateTiming();

          if (!isSimulationMode) {
            // Small delay to avoid rate limiting
            await sleep(200);
          }
        };

        for (let index = 0; index < personaSets.length; index++) {
          await runSingleSet(personaSets[index], index, personaSets.length);
        }

        let lastFit: ReturnType<typeof fitBwsMnlMoney> | null = null;
        let lastBootstrap: ReturnType<typeof bootstrapBwsMnlMoney> | null = null;
        const computePersonaResult = () => {
          const repeatability = computeRepeatability(personaSets, responses);
          const exposure = buildExposureDiagnostics(
            personaSets,
            responses,
            engineFeatures.map((feature) => feature.id),
            analysisPlan.vouchers
          );
          const failedTaskCount = responses.filter((response) => response.failed).length;
          if (analysisSettings.estimator === "legacy_score") {
            const perceivedValues = MaxDiffEngine.computePerceivedValues(responses, engineFeatures, analysisPlan.vouchers)
              .map((row) => {
                const rawWtp = row.perceivedValue;
                const displayWtp = displayWtpFromRaw(rawWtp, false);
                return {
                  ...row,
                  perceivedValue: Number(displayWtp.toFixed(2)),
                  rawWtp: Number(rawWtp.toFixed(2)),
                  adjustedWtp: Number(displayWtp.toFixed(2)),
                  displayWtp: Number(displayWtp.toFixed(2)),
                  ciLower95: Number(rawWtp.toFixed(2)),
                  ciUpper95: Number(rawWtp.toFixed(2)),
                  adjustmentSource: "model" as const,
                };
              });

            const summary: PersonaAnalysisSummary = {
              designMode: analysisPlan.designMode,
              estimator: "legacy_score",
              moneyTransform: analysisSettings.moneyTransform,
              beta: null,
              moneyScale: DEFAULT_MONEY_SCALE,
              designDiagnostics,
              repeatability,
              plannedTaskCount: personaSets.length,
              answeredTaskCount: exposure.answeredTasks,
              usedInFitTaskCount: exposure.answeredTasks,
              stopReason: "maxTasksReached",
              moneySignal: exposure.moneySignal,
              failedTaskCount,
              totalTaskCount: responses.length,
              failureRate: responses.length > 0 ? failedTaskCount / responses.length : 0,
              bootstrapSamples: 0,
              features: Object.fromEntries(
                perceivedValues.map((row) => [
                  row.featureId,
                  {
                    utility: row.netScore,
                    rawWtp: row.rawWtp ?? row.perceivedValue,
                    adjustedWtp: row.adjustedWtp ?? row.perceivedValue,
                    ciLower95: row.ciLower95 ?? row.perceivedValue,
                    ciUpper95: row.ciUpper95 ?? row.perceivedValue,
                    adjustmentSource: "model" as const,
                  },
                ])
              ),
            };
            return {
              perceivedValues,
              summary,
              repeatability,
              exposure,
            };
          }

          const fit = fitBwsMnlMoney(personaSets, responses, engineFeatures, analysisPlan.vouchers, {
            transform: analysisSettings.moneyTransform,
            moneyScale: DEFAULT_MONEY_SCALE,
            maxIters: 360,
            tolerance: 1e-6,
            learningRate: 0.03,
            seed: analysisSettings.designSeed + responses.length + personaId.length,
          });
          const bootstrap = bootstrapBwsMnlMoney(
            personaSets,
            responses,
            engineFeatures,
            analysisPlan.vouchers,
            analysisSettings.bootstrapSamples,
            {
              transform: analysisSettings.moneyTransform,
              moneyScale: DEFAULT_MONEY_SCALE,
              maxIters: 220,
              tolerance: 1e-5,
              learningRate: 0.035,
              seed: analysisSettings.designSeed + 10_000 + responses.length,
            }
          );
          lastFit = fit;
          lastBootstrap = bootstrap;

          const perceivedValues = engineFeatures
            .map((feature) => {
              const utility = fit.utilityByFeature[feature.id] ?? 0;
              const rawModelWtp = fit.rawWtpModelUnitsByFeature[feature.id] ?? 0;
              const rawWtp = wtpFromUtility(utility, fit.beta, analysisSettings.moneyTransform, fit.moneyScale);
              const displayWtp = displayWtpFromRaw(rawWtp, false);
              const bootstrapStats = bootstrap.byFeature[feature.id];
              const ciLower95 = bootstrapStats?.p2_5 ?? rawWtp;
              const ciUpper95 = bootstrapStats?.p97_5 ?? rawWtp;
              return {
                featureId: feature.id,
                featureName: feature.name,
                materialCost: feature.materialCost,
                perceivedValue: Number(displayWtp.toFixed(2)),
                netScore: Number(utility.toFixed(6)),
                utility: Number(utility.toFixed(6)),
                rawModelWtp: Number(rawModelWtp.toFixed(4)),
                rawWtp: Number(rawWtp.toFixed(2)),
                adjustedWtp: Number(displayWtp.toFixed(2)),
                displayWtp: Number(displayWtp.toFixed(2)),
                ciLower95: Number(ciLower95.toFixed(2)),
                ciUpper95: Number(ciUpper95.toFixed(2)),
                bootstrapMean: bootstrapStats ? Number(bootstrapStats.mean.toFixed(2)) : undefined,
                bootstrapMedian: bootstrapStats ? Number(bootstrapStats.median.toFixed(2)) : undefined,
                bootstrapCv: bootstrapStats?.cv ?? null,
                relativeCiWidth: bootstrapStats?.relativeCiWidth ?? null,
                adjustmentSource: "model" as const,
              } satisfies PerceivedValue;
            })
            .sort((left, right) => (right.rawWtp ?? 0) - (left.rawWtp ?? 0));

          const summary: PersonaAnalysisSummary = {
            designMode: analysisPlan.designMode,
            estimator: "bws_mnl_money",
            moneyTransform: analysisSettings.moneyTransform,
            moneyScale: fit.moneyScale,
            beta: fit.beta,
            designDiagnostics,
            repeatability,
            plannedTaskCount: personaSets.length,
            answeredTaskCount: exposure.answeredTasks,
            usedInFitTaskCount: fit.taskCount,
            stopReason: "maxTasksReached",
            moneySignal: exposure.moneySignal,
            failedTaskCount: fit.failedTaskCount,
            totalTaskCount: responses.length,
            failureRate: responses.length > 0 ? fit.failedTaskCount / responses.length : 0,
            bootstrapSamples: bootstrap.successfulSamples,
            features: Object.fromEntries(
              perceivedValues.map((row) => [
                row.featureId,
                {
                  utility: row.utility ?? row.netScore,
                  rawModelWtp: row.rawModelWtp,
                  rawWtp: row.rawWtp ?? row.perceivedValue,
                  adjustedWtp: row.adjustedWtp ?? row.perceivedValue,
                  ciLower95: row.ciLower95 ?? row.perceivedValue,
                  ciUpper95: row.ciUpper95 ?? row.perceivedValue,
                  bootstrap: bootstrap.byFeature[row.featureId],
                  adjustmentSource: row.adjustmentSource ?? "model",
                },
              ])
            ),
          };
          return {
            perceivedValues,
            summary,
            repeatability,
            exposure,
          };
        };

        let personaResult = computePersonaResult();
        let stabilityChecks: ReturnType<typeof evaluateStabilityChecks> = [];
        let stabilityGates: StabilityGateStatus | null = null;
        let stabilitySatisfied = false;
        let stopReason: "maxTasksReached" | "stabilityPass" | "userCancelled" | undefined;
        const stabilizationEnabled =
          analysisSettings.stabilizeToTarget &&
          analysisSettings.estimator === "bws_mnl_money" &&
          analysisSettings.designMode === "near_bibd";

        if (stabilizationEnabled) {
          while (true) {
            if (!lastFit || !lastBootstrap) break;
            stabilityGates = evaluateStabilityGates({
              answeredTasks: personaResult.exposure.answeredTasks,
              repeatTasksAnswered: personaResult.repeatability.totalRepeatPairs,
              jointRepeatability: personaResult.repeatability.jointAgreementRate,
              failureRate: personaResult.summary.failureRate,
              featureAppearances: personaResult.exposure.featureAppearances,
              voucherAppearances: personaResult.exposure.voucherAppearances,
              thresholds: {
                minTasksBeforeStability: analysisPlan.exposurePlan.minTasks,
                minFeatureAppearances: analysisSettings.targetFeatureExposures,
                minVoucherAppearances: analysisSettings.targetVoucherExposuresPerLevel,
                minRepeatTasks: analysisSettings.minRepeatTasks,
                minRepeatability: MIN_REPEATABILITY_FOR_STABILITY,
                maxFailureRate: MAX_FAILURE_RATE_FOR_STABILITY,
              },
            });
            if (stabilityGates.gatesMet) {
              const topIds = topFeaturesByWtp(lastFit.rawWtpByFeature, analysisSettings.stabilityTopN);
              stabilityChecks = evaluateStabilityChecks(
                topIds,
                lastBootstrap.byFeature,
                analysisSettings.stabilityTargetPercent / 100
              );
              stabilitySatisfied = stabilityChecks.length > 0 && stabilityChecks.every((check) => check.pass);
            } else {
              stabilityChecks = [];
              stabilitySatisfied = false;
            }

            if (stabilitySatisfied) {
              stopReason = "stabilityPass";
              break;
            }
            if (personaSets.length >= analysisSettings.stabilityMaxTasks) {
              stopReason = "maxTasksReached";
              break;
            }

            const remaining = analysisSettings.stabilityMaxTasks - personaSets.length;
            const batchSize = Math.min(analysisSettings.stabilityBatchSize, remaining);
            if (batchSize <= 0) break;

            if (analysisSettings.showProgressUpdates) {
              setAnalysisStatus(
                `${personaName}: adding ${batchSize} stabilization tasks (${personaSets.length}/${analysisSettings.stabilityMaxTasks})`
              );
            }

            const extended = MaxDiffEngine.extendMaxDiffPlan(personaSets, engineFeatures, analysisPlan.vouchers, {
              additionalTasks: batchSize,
              itemsPerSet: 4,
              designMode: analysisSettings.designMode,
              seed: analysisSettings.designSeed + batchesAdded + 701,
              repeatFraction: analysisSettings.repeatTaskFraction,
              improvementIterations: 450,
            });
            const newSets = extended.maxDiffSets.slice(personaSets.length);
            if (newSets.length === 0) break;

            const startIndex = personaSets.length;
            personaSets = extended.maxDiffSets;
            designDiagnostics = extended.diagnostics;
            batchesAdded++;

            for (let offset = 0; offset < newSets.length; offset++) {
              await runSingleSet(newSets[offset], startIndex + offset, personaSets.length);
            }

            personaResult = computePersonaResult();
          }

          if (lastFit && lastBootstrap) {
            stabilityGates = evaluateStabilityGates({
              answeredTasks: personaResult.exposure.answeredTasks,
              repeatTasksAnswered: personaResult.repeatability.totalRepeatPairs,
              jointRepeatability: personaResult.repeatability.jointAgreementRate,
              failureRate: personaResult.summary.failureRate,
              featureAppearances: personaResult.exposure.featureAppearances,
              voucherAppearances: personaResult.exposure.voucherAppearances,
              thresholds: {
                minTasksBeforeStability: analysisPlan.exposurePlan.minTasks,
                minFeatureAppearances: analysisSettings.targetFeatureExposures,
                minVoucherAppearances: analysisSettings.targetVoucherExposuresPerLevel,
                minRepeatTasks: analysisSettings.minRepeatTasks,
                minRepeatability: MIN_REPEATABILITY_FOR_STABILITY,
                maxFailureRate: MAX_FAILURE_RATE_FOR_STABILITY,
              },
            });
            if (stabilityGates.gatesMet) {
              const topIds = topFeaturesByWtp(lastFit.rawWtpByFeature, analysisSettings.stabilityTopN);
              stabilityChecks = evaluateStabilityChecks(
                topIds,
                lastBootstrap.byFeature,
                analysisSettings.stabilityTargetPercent / 100
              );
              stabilitySatisfied = stabilityChecks.length > 0 && stabilityChecks.every((check) => check.pass);
            } else {
              stabilityChecks = [];
              stabilitySatisfied = false;
            }
          }
          if (!stopReason) {
            stopReason = stabilitySatisfied ? "stabilityPass" : "maxTasksReached";
          }
        }

        if (analysisSettings.estimator === "bws_mnl_money" && personaResult.summary.estimator === "bws_mnl_money") {
          const statusLabel = !stabilizationEnabled
            ? "pass"
            : !stabilityGates?.gatesMet
              ? "pending"
              : stabilitySatisfied
                ? "pass"
                : "not_reached";

          personaResult.summary.stopReason = stopReason;
          personaResult.summary.usedInFitTaskCount = lastFit?.taskCount ?? personaResult.summary.usedInFitTaskCount;
          personaResult.summary.stabilization = {
            enabled: stabilizationEnabled,
            targetRelativeHalfWidth: analysisSettings.stabilityTargetPercent / 100,
            topN: analysisSettings.stabilityTopN,
            maxTasks: analysisSettings.stabilityMaxTasks,
            tasksUsed: lastFit?.taskCount ?? personaResult.exposure.answeredTasks,
            batchesAdded,
            isStable: stabilizationEnabled ? stabilitySatisfied : true,
            statusLabel,
            stopReason,
            gates: stabilityGates ?? undefined,
            checks: stabilityChecks.map((check) => ({
              featureId: check.featureId,
              mean: check.mean,
              relativeHalfWidth: check.relativeHalfWidth,
              pass: check.pass,
            })),
          };
        }

        if (analysisSettings.enableCalibration && personaResult.summary.estimator === "bws_mnl_money") {
          const selectedTop = [...personaResult.perceivedValues]
            .sort((left, right) => (right.utility ?? 0) - (left.utility ?? 0))
            .slice(0, analysisSettings.calibrationFeatureCount)
            .map((row) => row.featureId);
          const selectedUncertain = [...personaResult.perceivedValues]
            .sort((left, right) => (right.relativeCiWidth ?? 0) - (left.relativeCiWidth ?? 0))
            .slice(0, Math.ceil(analysisSettings.calibrationFeatureCount / 2))
            .map((row) => row.featureId);
          const calibrationFeatureIds = Array.from(new Set([...selectedTop, ...selectedUncertain]));
          const calibrationResults: CalibrationResult[] = [];
          let reusedFromCache = 0;

          for (const featureId of calibrationFeatureIds) {
            const feature = engineFeatures.find((item) => item.id === featureId);
            const row = personaResult.perceivedValues.find((item) => item.featureId === featureId);
            if (!feature || !row) continue;
            const cacheKey = buildCalibrationCacheKey({
              vehicleId: selectedVehicle,
              personaId,
              featureId,
              features: engineFeatures,
              model: storedModelConfig.model,
              serviceTier: storedModelConfig.serviceTier,
              configFingerprint,
            });

            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              try {
                const parsed = JSON.parse(cached) as CalibrationResult;
                if (
                  Number.isFinite(parsed.calibrationLower) &&
                  Number.isFinite(parsed.calibrationUpper) &&
                  Number.isFinite(parsed.calibrationMid)
                ) {
                  calibrationResults.push(parsed);
                  reusedFromCache++;
                  continue;
                }
              } catch {
                // fall through and re-run calibration
              }
            }

            const modelGuess = Math.max(1, row.rawWtp ?? row.perceivedValue ?? 1);
            try {
              const result = await runFeatureCashCalibrationSearch(
                async (amount) => {
                  if (isSimulationMode || !llmClient) {
                    return amount < modelGuess ? "A" : "B";
                  }
                  const decision = await llmClient.chooseFeatureVsCash(persona, vehicleForAnalysis, {
                    featureId: feature.id,
                    featureName: feature.name,
                    featureDescription: feature.description,
                    amount,
                  });
                  return decision.choice;
                },
                {
                  initialGuess: modelGuess,
                  minX: Math.max(1, voucherBounds.min_discount),
                  maxX: Math.max(50, voucherBounds.max_discount * 2),
                  steps: analysisSettings.calibrationSteps,
                  minCap: Math.max(0.5, voucherBounds.min_discount / 2),
                  maxCap: Math.max(200, voucherBounds.max_discount * 6),
                }
              );

              const calibrationRecord: CalibrationResult = {
                featureId: feature.id,
                featureName: feature.name,
                calibrationLower: Number(result.calibrationLower.toFixed(2)),
                calibrationUpper: Number(result.calibrationUpper.toFixed(2)),
                calibrationMid: Number(result.calibrationMid.toFixed(2)),
                stepsUsed: result.stepsUsed,
                transcript: result.transcript,
              };
              calibrationResults.push(calibrationRecord);
              localStorage.setItem(cacheKey, JSON.stringify(calibrationRecord));
            } catch (calibrationError) {
              const reason = calibrationError instanceof Error ? calibrationError.message : String(calibrationError);
              console.warn(`Calibration skipped for ${feature.name}: ${reason}`);
            }
          }

          let scaleFactor = 1;
          if (calibrationResults.length > 0) {
            const ratios = calibrationResults
              .map((record) => {
                const model = personaResult.summary.features[record.featureId]?.rawWtp;
                if (!model || !Number.isFinite(model) || Math.abs(model) < 1e-9) return null;
                return record.calibrationMid / model;
              })
              .filter((value): value is number => value != null && Number.isFinite(value));
            if (ratios.length > 0) {
              scaleFactor = median(ratios);
            }
          }

          const calibrationByFeature = new Map(calibrationResults.map((item) => [item.featureId, item]));
          const strategy = analysisSettings.calibrationStrategy as CalibrationAdjustmentStrategy;
          personaResult.perceivedValues = personaResult.perceivedValues
            .map((row) => {
              const calibration = calibrationByFeature.get(row.featureId);
              const scaled = (row.rawWtp ?? row.perceivedValue) * scaleFactor;
              let adjusted = scaled;
              let source: PerceivedValue["adjustmentSource"] = scaleFactor === 1 ? "model" : "scaled";
              if (strategy === "partial_override" && calibration) {
                adjusted = calibration.calibrationMid;
                source = "calibrated_override";
              }
              const next: PerceivedValue = {
                ...row,
                perceivedValue: Number(displayWtpFromRaw(adjusted, false).toFixed(2)),
                adjustedWtp: Number(adjusted.toFixed(2)),
                displayWtp: Number(displayWtpFromRaw(adjusted, false).toFixed(2)),
                adjustmentSource: source,
                calibrationLower: calibration?.calibrationLower,
                calibrationUpper: calibration?.calibrationUpper,
                calibrationMid: calibration?.calibrationMid,
              };
              return next;
            })
            .sort((left, right) => (right.adjustedWtp ?? right.perceivedValue) - (left.adjustedWtp ?? left.perceivedValue));

          Object.entries(personaResult.summary.features).forEach(([featureId, featureSummary]) => {
            const row = personaResult.perceivedValues.find((item) => item.featureId === featureId);
            const calibration = calibrationByFeature.get(featureId);
            if (!row) return;
            personaResult.summary.features[featureId] = {
              ...featureSummary,
              adjustedWtp: row.adjustedWtp ?? row.perceivedValue,
              adjustmentSource: row.adjustmentSource ?? featureSummary.adjustmentSource,
              ...(calibration ? { calibration } : {}),
            };
          });

          personaResult.summary.calibration = {
            enabled: true,
            strategy,
            scaleFactor,
            featureCount: calibrationResults.length,
            reusedFromCache,
            results: calibrationResults,
          };
        }

        const resultKey = results.has(personaName) ? `${personaName} (${personaId})` : personaName;
        results.set(resultKey, personaResult.perceivedValues);
        summaries.set(resultKey, personaResult.summary);

        const cacheKey = cacheKeyByPersona.get(personaId);
        if (analysisSettings.persistResults && cacheKey) {
          const payload: PersonaAnalysisResult = {
            perceivedValues: personaResult.perceivedValues,
            summary: personaResult.summary,
          };
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        }
      }

      const summarizedCallLogs = callLogs.map(({ request, response, ...log }) => log);
      onAnalysisComplete(results, summarizedCallLogs, summaries);
      setAnalysisStatus('Analysis complete!');
      setProgress(100);
    } catch (error) {
      console.error('Analysis failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAnalysisStatus(`Analysis failed: ${message}`);
      toast({
        title: "Analysis failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (timingIntervalId !== null) {
        window.clearInterval(timingIntervalId);
      }
      setIsAnalyzing(false);
      setCurrentPersona('');
      setElapsedTime(0);
      setEta(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="type-caption">Step 4</p>
        <h2 className="type-headline">MaxDiff Tradeoff Analysis</h2>
        <p className="type-deck mx-auto content-measure">AI-powered persona simulation for feature valuation.</p>
      </div>

      {!hasApiKey && !useCache && !isSimulationMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Server OpenAI key required</AlertTitle>
          <AlertDescription>
            Add your OpenAI API key in Workspace → Configuration to run MaxDiff analysis.
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full" id="workspace-hub">
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
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
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

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
                Vehicle
              </p>
              <p className="truncate text-sm font-semibold">{vehiclesById[selectedVehicle]?.name ?? selectedVehicle}</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                Features
              </p>
              <p className="text-sm font-semibold">{features.length} loaded</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                Model
              </p>
              <p className="truncate text-sm font-semibold">{selectedModel}</p>
              <p className="text-xs text-muted-foreground">{serviceTier === 'flex' ? 'Flex tier' : 'Standard tier'}</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" />
                Vouchers
              </p>
              <p className="text-sm font-semibold">{estimatedPlan.vouchers.length} levels</p>
              <p className="text-xs text-muted-foreground">
                {estimatedPlan.vouchers.map((voucher) => `$${voucher.amount}`).join(", ")}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Method
              </p>
              <p className="text-sm font-semibold">{analysisSettings.designMode === "near_bibd" ? "Near-BIBD" : "Legacy"}</p>
              <p className="text-xs text-muted-foreground">
                {analysisSettings.estimator === "bws_mnl_money" ? "BWS MNL" : "Legacy score"}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-3 shadow-subtle transition-colors hover:bg-muted/35">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" />
                Cost
              </p>
              <p className="text-sm font-semibold">
                {costEstimate ? (useCache || isSimulationMode ? '$0.00' : formatPrice(costEstimate.totalCost)) : '—'}
              </p>
              {costEstimate && !useCache && !isSimulationMode && (
                <p className="text-xs text-muted-foreground">~{costEstimate.totalCalls} calls</p>
              )}
              {isSimulationMode && (
                <p className="text-xs text-muted-foreground">Simulation mode</p>
              )}
              {useCache && (
                <p className="text-xs text-muted-foreground">Cache enabled</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {analysisSettings.stabilizeToTarget && estimatedPlan.exposurePlan.capBelowRequired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Stability cap below required minimum</AlertTitle>
          <AlertDescription>
            Stability gates require at least {estimatedPlan.exposurePlan.minTasks} answered tasks, but Max tasks is set
            to {analysisSettings.stabilityMaxTasks}. Stability pass will remain pending unless you increase Max tasks.
          </AlertDescription>
        </Alert>
      )}

      {estimatedPlan.designDiagnostics && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Design diagnostics</CardTitle>
            <CardDescription>
              {estimatedPlan.designMode === "near_bibd"
                ? "Near-BIBD balance diagnostics for generated tasks."
                : "Legacy design diagnostics for comparison."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border border-border-subtle bg-muted/20 p-3">
                <p className="font-medium">Item count</p>
                <p className="text-muted-foreground">
                  min {estimatedPlan.designDiagnostics.itemSummary.min.toFixed(0)} · mean {estimatedPlan.designDiagnostics.itemSummary.mean.toFixed(2)} · max {estimatedPlan.designDiagnostics.itemSummary.max.toFixed(0)}
                </p>
                <p className="text-muted-foreground">CV {(estimatedPlan.designDiagnostics.itemSummary.cv * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-md border border-border-subtle bg-muted/20 p-3">
                <p className="font-medium">Pair count</p>
                <p className="text-muted-foreground">
                  min {estimatedPlan.designDiagnostics.pairSummary.observedPairs.min.toFixed(0)} · mean {estimatedPlan.designDiagnostics.pairSummary.observedPairs.mean.toFixed(2)} · max {estimatedPlan.designDiagnostics.pairSummary.observedPairs.max.toFixed(0)}
                </p>
                <p className="text-muted-foreground">
                  CV {(estimatedPlan.designDiagnostics.pairSummary.observedPairs.cv * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-md border border-border-subtle bg-muted/20 p-3">
                <p className="font-medium">Coverage</p>
                <p className="text-muted-foreground">
                  {(estimatedPlan.designDiagnostics.pairSummary.coverage * 100).toFixed(1)}% pairs seen
                </p>
                <p className="text-muted-foreground">
                  {(estimatedPlan.designDiagnostics.pairSummary.neverSeenFraction * 100).toFixed(1)}% never seen
                </p>
              </div>
              <div className="rounded-md border border-border-subtle bg-muted/20 p-3">
                <p className="font-medium">Imbalance</p>
                <p className="text-muted-foreground">
                  item Δ {estimatedPlan.designDiagnostics.itemCountImbalance.toFixed(0)}
                </p>
                <p className="text-muted-foreground">
                  pair Δ {estimatedPlan.designDiagnostics.pairCountImbalance.toFixed(0)}
                </p>
              </div>
              {estimatedPlan.designDiagnostics.voucherSummary && (
                <div className="rounded-md border border-border-subtle bg-muted/20 p-3">
                  <p className="font-medium">Voucher exposure</p>
                  <p className="text-muted-foreground">
                    min {estimatedPlan.designDiagnostics.voucherSummary.min.toFixed(0)} · mean{" "}
                    {estimatedPlan.designDiagnostics.voucherSummary.mean.toFixed(2)} · max{" "}
                    {estimatedPlan.designDiagnostics.voucherSummary.max.toFixed(0)}
                  </p>
                  <p className="text-muted-foreground">
                    coverage {((estimatedPlan.designDiagnostics.voucherCoverage ?? 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground">
                    {estimatedPlan.vouchers
                      .map((voucher) => {
                        const count = estimatedPlan.designDiagnostics?.voucherCounts?.[voucher.id] ?? 0;
                        return `${formatAmountLabel(voucher.amount)}x${count}`;
                      })
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center space-x-2" id="design-hub">
        <Checkbox
          id="useCache"
          checked={useCache}
          onCheckedChange={(checked) => setUseCache(Boolean(checked))}
        />
        <Label htmlFor="useCache" className="text-sm font-medium text-muted-foreground">
          Use cached results (skip AI analysis)
        </Label>
      </div>

      {!hasApiKey && !useCache && !isSimulationMode ? (
        <ApiKeyInput onApiKeySet={handleApiKeySet} hasApiKey={hasApiKey} />
      ) : !isAnalyzing ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Ready to Analyze</CardTitle>
            <CardDescription>
              Start the MaxDiff analysis with {totalSets} feature sets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSimulationMode && (
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Simulation mode enabled</AlertTitle>
                <AlertDescription>
                  Results are randomized for UI/testing only. No real OpenAI API calls are made.
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={runAnalysis}
              size="lg"
              variant="analytics"
              className="px-8"
            >
              <Brain className="h-5 w-5 mr-2" />
              {isSimulationMode ? "Start Simulated Analysis" : "Start MaxDiff Analysis"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 animate-pulse text-primary" />
                  Analysis in Progress
                </CardTitle>
                <CardDescription>
                  {analysisSettings.showProgressUpdates
                    ? isSimulationMode
                      ? 'Simulated personas are evaluating randomized feature sets...'
                      : 'AI persona is evaluating feature sets...'
                    : isSimulationMode
                      ? 'Simulation is running with compact progress updates.'
                      : 'Analysis is running with compact progress updates.'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApiConsoleOpen(true)}
              >
                <TerminalSquare className="mr-2 h-4 w-4" />
                View more
              </Button>
            </div>
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
                ⏱ Elapsed: <strong>{formatClock(elapsedTime)}</strong> · ETA: <strong>{formatClock(eta)}</strong>
              </div>
            )}

            <div className="space-y-2" id="insights-console">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Live API calls (last 4)</p>
                <p className="text-xs text-muted-foreground">Newest call appears at the top</p>
              </div>
              <div className="space-y-2 rounded-lg border border-border-subtle bg-muted/20 p-3 min-h-[19rem]">
                {liveCallCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Waiting for the first response…</p>
                ) : (
                  [...liveCallCards, ...new Array(Math.max(0, 4 - liveCallCards.length)).fill(null)].map((call, index) => (
                    call ? (
                    <div
                      key={call.id}
                      className={cn(
                        'analysis-live-card rounded-md border border-border-subtle bg-card/90 p-3 shadow-subtle',
                        call.status === 'error' && 'border-destructive/40 bg-destructive/5',
                      )}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{call.personaName ?? call.personaId ?? 'Persona'}</Badge>
                        <Badge variant="secondary">{call.setId ?? 'Set'}</Badge>
                        <Badge variant={call.status === 'error' ? 'destructive' : 'outline'}>
                          {(call.status ?? 'success').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Features: {call.displayedFeatures.join(' · ')}</p>
                      <p className="text-xs mt-1">
                        Most: <span className="font-medium text-data-positive">{call.mostValued}</span>
                        {' · '}
                        Least: <span className="font-medium text-data-negative">{call.leastValued}</span>
                      </p>
                    </div>
                    ) : (
                      <div key={`live-call-slot-${index}`} className="rounded-md border border-dashed border-border-subtle/70 bg-card/50 p-3" />
                    )
                  ))
                )}
              </div>
            </div>

            {progress === 100 && (
              <div className="text-center pt-2">
                <CheckCircle className="h-8 w-8 text-data-positive mx-auto mb-2" />
                <p className="text-sm font-medium text-data-positive">Analysis Complete!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isApiConsoleOpen} onOpenChange={setIsApiConsoleOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Live API Console</DialogTitle>
            <DialogDescription>
              Real-time request and response log, styled as command prompt output.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[65vh] overflow-y-auto rounded-md border border-emerald-500/30 bg-[#08110d] p-3 font-mono text-xs text-emerald-200">
            {apiCallLogs.length === 0 ? (
              <p className="text-emerald-300/70">$ waiting for API calls...</p>
            ) : (
              <div className="space-y-4">
                {apiCallLogs.map((call) => (
                  <div key={call.id} className="rounded border border-emerald-500/20 bg-black/25 p-3">
                    <p className="text-emerald-300">
                      $ POST /v1/responses --persona "{call.personaName ?? call.personaId ?? 'unknown'}" --set "{call.setId ?? 'n/a'}"
                    </p>
                    <p className="mt-2 text-emerald-400/80">&gt; request</p>
                    <pre className="whitespace-pre-wrap break-words text-emerald-100/90">{call.request ?? '// waiting request payload...'}</pre>
                    <p className="mt-2 text-emerald-400/80">&gt; response [{call.status ?? 'success'}]</p>
                    <pre className="whitespace-pre-wrap break-words text-emerald-100/90">
                      {call.response || (call.status === 'pending' ? '// waiting response...' : '// no response captured')}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
