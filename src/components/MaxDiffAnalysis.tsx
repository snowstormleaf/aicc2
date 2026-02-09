import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, DollarSign, CheckCircle, AlertCircle, SlidersHorizontal } from "lucide-react";
import { MaxDiffEngine, PerceivedValue } from "@/lib/maxdiff-engine";
import { buildSystemPrompt, buildUserPrompt, buildVoucherPrompt, LLMClient } from "@/lib/llm-client";
import { usePersonas } from "@/personas/store";
import { useVehicles } from "@/vehicles/store";
import { ApiKeyInput } from "./ApiKeyInput";
import { DEFAULT_MODEL, DEFAULT_SERVICE_TIER, formatPrice, getStoredModelConfig, MODEL_PRICING } from "@/lib/model-pricing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { calculateOptimalSets } from "@/lib/design-parameters";
import type { MaxDiffCallLog } from "@/types/analysis";

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
  const [useCache, setUseCache] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [serviceTier, setServiceTier] = useState(DEFAULT_SERVICE_TIER);
  const { toast } = useToast();

  const { personasById, getPersonaName } = usePersonas();
  const { vehiclesById } = useVehicles();

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

    updateModelConfig();
    window.addEventListener('model-config-updated', updateModelConfig);
    window.addEventListener('storage', updateModelConfig);
    return () => {
      window.removeEventListener('model-config-updated', updateModelConfig);
      window.removeEventListener('storage', updateModelConfig);
    };
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setHasApiKey(!!key);
  };

  const designParams = calculateOptimalSets(features.length);
  const totalSets = designParams.sets;

  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  const buildEngineFeatures = (items: Feature[]) => {
    const seenIds = new Set<string>();
    return items.map((f, idx) => {
      let baseId = (f.id || f.name.toLowerCase().replace(/\s+/g, '-'));
      baseId = baseId.replace(/[^a-z0-9-]/g, '').toLowerCase() || `feature-${idx}`;
      let id = baseId;
      let i = 1;
      while (seenIds.has(id)) {
        id = `${baseId}-${i++}`;
      }
      seenIds.add(id);
      return {
        id,
        name: f.name,
        description: f.description,
        materialCost: f.materialCost
      };
    });
  };

  const costEstimate = useMemo(() => {
    if (useCache) {
      return {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCalls: 0
      };
    }

    const vehicle = vehiclesById[selectedVehicle];
    if (!vehicle) return null;

    const { sets: numSets } = calculateOptimalSets(features.length);
    const totalCalls = selectedPersonas.length * numSets;
    if (totalCalls === 0) return null;

    const engineFeatures = buildEngineFeatures(features);
    const featureCosts = engineFeatures.map(f => f.materialCost);
    const vouchers = MaxDiffEngine.generateVouchers(featureCosts, {
      min_discount: 10,
      max_discount: 200,
      levels: 6
    });
    const maxDiffSets = MaxDiffEngine.generateMaxDiffSets(
      engineFeatures,
      vouchers,
      Math.max(3, Math.min(5, Math.ceil(engineFeatures.length / 5)))
    );
    const sampleSet = maxDiffSets[0];
    if (!sampleSet) return null;

    const featureDescMap = new Map<string, string>();
    engineFeatures.forEach(f => {
      featureDescMap.set(f.id, f.description);
    });
    vouchers.forEach(v => {
      featureDescMap.set(v.id, v.description);
    });

    const vehicleForAnalysis = {
      brand: vehicle.manufacturer || vehicle.name,
      name: vehicle.name
    };

    const personaTokenCounts = selectedPersonas.map((personaId) => {
      const persona = personasById[personaId];
      return persona ? estimateTokens(buildSystemPrompt(persona)) : 0;
    });
    const avgSystemTokens = personaTokenCounts.length
      ? personaTokenCounts.reduce((sum, value) => sum + value, 0) / personaTokenCounts.length
      : 0;
    const userTokens = estimateTokens(buildUserPrompt(sampleSet, vehicleForAnalysis, featureDescMap));

    const perCallInputTokens = avgSystemTokens + userTokens;
    const perCallOutputTokens = 200;

    let inputTokens = Math.round(perCallInputTokens * totalCalls);
    let outputTokens = Math.round(perCallOutputTokens * totalCalls);

    const voucherPrompt = buildVoucherPrompt(new Map(engineFeatures.map((f) => [f.name, f.description])));
    const voucherInputTokens = estimateTokens('You are an automotive pricing expert.') + estimateTokens(voucherPrompt);
    inputTokens += voucherInputTokens;
    outputTokens += 80;

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
      totalCalls
    };
  }, [features, personasById, selectedModel, selectedPersonas, selectedVehicle, serviceTier, useCache, vehiclesById]);

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
    if (!hasApiKey) {
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

    const startTime = Date.now();
    let callsDone = 0;

    try {
      const callLogs: MaxDiffCallLog[] = [];
      const { sets: numSets } = calculateOptimalSets(features.length);
      const totalCalls = selectedPersonas.length * numSets;
      const results = new Map<string, PerceivedValue[]>();

      // Initialize LLM client
      const storedModelConfig = getStoredModelConfig();
      setSelectedModel(storedModelConfig.model);
      setServiceTier(storedModelConfig.serviceTier);
      const llmClient = new LLMClient({
        apiKey,
        model: storedModelConfig.model,
        reasoningModel: storedModelConfig.model,
        serviceTier: storedModelConfig.serviceTier,
        useGPT: true,
        temperature: 0.2,
      });

      // Prepare feature descriptions for voucher bounds
      const featureDescriptions = new Map(
        features.map(f => [f.name, f.description])
      );

      // Get AI-recommended voucher bounds
      const voucherBounds = await llmClient.recommendVoucherBounds(featureDescriptions);
      
      for (const personaName of selectedPersonas) {
        setCurrentPersona(getPersonaName(personaName));
        
        // Check cache first
        const cacheKey = `maxdiff_${selectedVehicle}_${personaName}`;
        if (useCache) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const cachedResults = JSON.parse(cached);
              results.set(personaName, cachedResults);
              continue;
            } catch (e) {
              console.warn('Failed to parse cached results:', e);
            }
          }
        }

        const persona = personasById[personaName];
        const vehicle = vehiclesById[selectedVehicle];
        
        if (!persona || !vehicle) {
          throw new Error(`Invalid persona ${personaName} or vehicle ${selectedVehicle}`);
        }

        // Transform vehicle to match LLM client expectations
        const vehicleForAnalysis = {
          brand: vehicle.manufacturer || vehicle.name,
          name: vehicle.name
        };

        setAnalysisStatus(`Starting analysis for ${personaName}...`);

        // Convert features to proper format with unique IDs
        const engineFeatures = buildEngineFeatures(features);

        // Generate vouchers with AI bounds
        const featureCosts = engineFeatures.map(f => f.materialCost);
        const vouchers = MaxDiffEngine.generateVouchers(featureCosts, voucherBounds);
        
        // Generate MaxDiff sets
        const maxDiffSets = MaxDiffEngine.generateMaxDiffSets(
          engineFeatures,
          vouchers,
          Math.max(3, Math.min(5, Math.ceil(engineFeatures.length / 5)))
        );
        
        // Create feature descriptions map
        const featureDescMap = new Map<string, string>();
        engineFeatures.forEach(f => {
          featureDescMap.set(f.id, f.description);
        });
        vouchers.forEach(v => {
          featureDescMap.set(v.id, v.description);
        });

        // Collect responses
        const responses = [];

        for (let i = 0; i < maxDiffSets.length; i++) {
          setCurrentSet(i + 1);
          setAnalysisStatus(`${personaName}: Analyzing set ${i + 1}/${maxDiffSets.length}`);
          
          try {
            const timestamp = new Date().toISOString();
            const displayedFeatures = maxDiffSets[i].options.map(option => option.name);
            const optionNameById = new Map(maxDiffSets[i].options.map(option => [option.id, option.name]));

            const response = await llmClient.rankOptions(
              maxDiffSets[i],
              persona,
              vehicleForAnalysis,
              featureDescMap
            );
            
            responses.push(response);
            callLogs.push({
              timestamp,
              displayedFeatures,
              mostValued: optionNameById.get(response.mostValued) ?? response.mostValued,
              leastValued: optionNameById.get(response.leastValued) ?? response.leastValued,
            });
            callsDone++;

            // Update timing
            const elapsed = (Date.now() - startTime) / 1000;
            const avgPerCall = elapsed / callsDone;
            const remaining = totalCalls - callsDone;
            setElapsedTime(Math.floor(elapsed));
            setEta(Math.floor(avgPerCall * remaining));
            setProgress((callsDone / totalCalls) * 100);
            
          } catch (error) {
            console.error(`Error processing set ${i + 1}:`, error);
            
            // Fallback to random selection
            const options = maxDiffSets[i].options;
            const mostValued = options[Math.floor(Math.random() * options.length)].id;
            const leastValued = options.filter(o => o.id !== mostValued)[Math.floor(Math.random() * (options.length - 1))].id;
            
            responses.push({
              setId: maxDiffSets[i].id,
              personaId: persona.id,
              mostValued,
              leastValued,
              ranking: []
            });
            const timestamp = new Date().toISOString();
            const optionNameById = new Map(maxDiffSets[i].options.map(option => [option.id, option.name]));
            callLogs.push({
              timestamp,
              displayedFeatures: maxDiffSets[i].options.map(option => option.name),
              mostValued: optionNameById.get(mostValued) ?? mostValued,
              leastValued: optionNameById.get(leastValued) ?? leastValued,
            });
            callsDone++;
            
            const elapsed = (Date.now() - startTime) / 1000;
            const avgPerCall = elapsed / callsDone;
            const remaining = totalCalls - callsDone;
            setElapsedTime(Math.floor(elapsed));
            setEta(Math.floor(avgPerCall * remaining));
            setProgress((callsDone / totalCalls) * 100);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Compute perceived values
        const perceivedValues = MaxDiffEngine.computePerceivedValues(
          responses,
          engineFeatures,
          vouchers
        );

        results.set(personaName, perceivedValues);

        // Cache results
        localStorage.setItem(cacheKey, JSON.stringify(perceivedValues));
      }

      onAnalysisComplete(results, callLogs);
      setAnalysisStatus('Analysis complete!');

    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisStatus(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
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

      {!hasApiKey && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API key required</AlertTitle>
          <AlertDescription>
            Add your OpenAI API key in Workspace → Configuration to run MaxDiff analysis.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
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
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">Personas:</span>
              <div className="mt-1">
                {selectedPersonas.map(persona => (
                  <Badge key={persona} variant="outline" className="mr-1 mb-1">
                    {getPersonaName(persona)}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium">Vehicle:</span>
              <Badge variant="outline" className="ml-2">
                {vehiclesById[selectedVehicle]?.name ?? selectedVehicle}
              </Badge>
            </div>
            <div>
              <span className="text-sm font-medium">Features:</span>
              <Badge variant="outline" className="ml-2">
                {features.length} loaded
              </Badge>
            </div>
            <div>
              <span className="text-sm font-medium">Model:</span>
              <Badge variant="outline" className="ml-2">
                {selectedModel}
              </Badge>
              <Badge variant="outline" className="ml-2">
                {serviceTier === 'flex' ? 'Flex' : 'Standard'}
              </Badge>
            </div>
            {costEstimate && (
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated cost:</span>
                  <span className="font-semibold">
                    {useCache ? '$0.00' : formatPrice(costEstimate.totalCost)}
                  </span>
                </div>
                {!useCache && (
                  <p className="text-xs text-muted-foreground">
                    ~{costEstimate.totalCalls} calls · {Math.round(costEstimate.inputTokens)} input tokens · {Math.round(costEstimate.outputTokens)} output tokens
                  </p>
                )}
                {useCache && (
                  <p className="text-xs text-muted-foreground">Cache enabled: no new API calls expected.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Expected Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium mb-1">Feature Values</p>
              <p className="text-muted-foreground">Perceived value vs material cost analysis</p>
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">Scatter Plot</p>
              <p className="text-muted-foreground">Visual representation of value-cost relationships</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {!hasApiKey ? (
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
              disabled={!hasApiKey}
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
              AI persona is evaluating feature sets...
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
            
            {currentPersona && (
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Analyzing: <strong>{currentPersona}</strong></p>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Current Set: {currentSet}</p>
              <p className="text-sm text-muted-foreground">{analysisStatus}</p>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              ⏱ Elapsed: <strong>{Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</strong> · 
              ETA: <strong>{Math.floor(eta / 60)}m {eta % 60}s</strong>
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
    </div>
  );
};
