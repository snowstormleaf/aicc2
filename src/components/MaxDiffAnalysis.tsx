import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { MaxDiffEngine, PerceivedValue } from "@/lib/maxdiff-engine";
import { LLMClient } from "@/lib/llm-client";
import { usePersonas } from "@/personas/store";
import { useVehicles } from "@/vehicles/store";
import { ApiKeyInput } from "./ApiKeyInput";

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
  onAnalysisComplete: (results: Map<string, PerceivedValue[]>) => void;
}

export const MaxDiffAnalysis = ({ features, selectedPersonas, selectedVehicle, onAnalysisComplete }: MaxDiffAnalysisProps) => {
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

  const { personasById, getPersonaName } = usePersonas();
  const { vehiclesById } = useVehicles();

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasApiKey(true);
    }
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setHasApiKey(!!key);
  };

// MaxDiff BIBD (Balanced Incomplete Block Design) calculations
  // t = number of treatments (features)
  // k = items per set (typically 4)
  // r = number of times each feature appears
  // b = number of blocks (sets)
  // λ = number of times each pair appears together
  
  const calculateOptimalSets = (numFeatures: number, itemsPerSet: number = 4) => {
    // For optimal design: each feature should appear r times
    // Recommended r = 3-5 for good statistical power
    const optimalR = Math.max(3, Math.min(5, Math.ceil(numFeatures / 5)));
    
    // Number of sets (blocks) = (t * r) / k
    const calculatedSets = Math.ceil((numFeatures * optimalR) / itemsPerSet);
    
    // For balanced design, λ (times each pair appears) = r * (k-1) / (t-1)
    // This should be close to an integer for good balance
    const lambda = (optimalR * (itemsPerSet - 1)) / (numFeatures - 1);
    
    // Practical constraints: minimum 8 sets, maximum 25 sets for feasibility
    const minSets = Math.max(8, Math.ceil(numFeatures / 2));
    const maxSets = Math.min(25, numFeatures * 2);
    
    const finalSets = Math.max(minSets, Math.min(maxSets, calculatedSets));
    
    return {
      sets: finalSets,
      r: optimalR,
      lambda: lambda,
      efficiency: lambda % 1 === 0 ? 1 : 1 - (lambda % 1) // Closer to integer λ = more efficient
    };
  };

  const designParams = calculateOptimalSets(features.length);
  const totalSets = designParams.sets;

  const runAnalysis = async () => {
    if (!hasApiKey) {
      setAnalysisStatus('API key required');
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
      const { sets: numSets } = calculateOptimalSets(features.length);
      const totalCalls = selectedPersonas.length * numSets;
      const results = new Map<string, PerceivedValue[]>();

      // Initialize LLM client
      const llmClient = new LLMClient({
        apiKey,
        model: 'gpt-4.1-mini-2025-04-14',
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

        // Convert features to proper format with IDs
        const engineFeatures = features.map(f => ({
          id: f.id || f.name.toLowerCase().replace(/\s+/g, '-'),
          name: f.name,
          description: f.description,
          materialCost: f.materialCost
        }));

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
            const response = await llmClient.rankOptions(
              maxDiffSets[i],
              persona,
              vehicleForAnalysis,
              featureDescMap
            );
            
            responses.push(response);
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

      onAnalysisComplete(results);
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

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Analysis Setup
            </CardTitle>
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
                {vehicleNames[selectedVehicle as keyof typeof vehicleNames]}
              </Badge>
            </div>
            <div>
              <span className="text-sm font-medium">Features:</span>
              <Badge variant="outline" className="ml-2">
                {features.length} loaded
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              BIBD Design Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Features (t):</span>
                <span className="font-medium">{features.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items per set (k):</span>
                <span className="font-medium">4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sets required (b):</span>
                <span className="font-medium">{totalSets}</span>
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
            </div>
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