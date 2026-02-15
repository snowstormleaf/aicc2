import { lazy, Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PersonaSelector } from "@/components/PersonaSelector";
import { VehicleSelector } from "@/components/VehicleSelector";
import { PerceivedValue } from "@/lib/maxdiff-engine";
import { BurgerMenu } from "@/components/BurgerMenu";
import { Car, Users, Upload, BarChart3, CheckCircle, ArrowRight } from "lucide-react";
import type { MaxDiffCallLog } from "@/types/analysis";

const FeatureUpload = lazy(() =>
  import("@/components/FeatureUpload").then((module) => ({ default: module.FeatureUpload }))
);
const MaxDiffAnalysis = lazy(() =>
  import("@/components/MaxDiffAnalysis").then((module) => ({ default: module.MaxDiffAnalysis }))
);
const ResultsVisualization = lazy(() =>
  import("@/components/ResultsVisualization").then((module) => ({ default: module.ResultsVisualization }))
);

interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

type Step = 'persona' | 'vehicle' | 'upload' | 'analysis' | 'results';

const WORKFLOW_SESSION_STORAGE_KEY = 'analysis_workflow_state';

type PersistedWorkflowState = {
  currentStep: Step;
  selectedPersonas: string[];
  selectedVehicle: string | null;
  features: Feature[];
  analysisResults: Array<[string, PerceivedValue[]]> | null;
  callLogs: MaxDiffCallLog[];
  workspaceTab: string;
};

const readPersistedWorkflowState = (): PersistedWorkflowState | null => {
  try {
    const raw = sessionStorage.getItem(WORKFLOW_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkflowState>;
    if (!parsed || typeof parsed !== 'object') return null;

    const validSteps: Step[] = ['persona', 'vehicle', 'upload', 'analysis', 'results'];
    const step = validSteps.includes(parsed.currentStep as Step) ? (parsed.currentStep as Step) : 'persona';
    const validWorkspaceTabs = ['config', 'design', 'filters'];
    const workspaceTab =
      typeof parsed.workspaceTab === 'string' && validWorkspaceTabs.includes(parsed.workspaceTab)
        ? parsed.workspaceTab
        : 'config';

    return {
      currentStep: step,
      selectedPersonas: Array.isArray(parsed.selectedPersonas) ? parsed.selectedPersonas : [],
      selectedVehicle: typeof parsed.selectedVehicle === 'string' ? parsed.selectedVehicle : null,
      features: Array.isArray(parsed.features) ? parsed.features : [],
      analysisResults: Array.isArray(parsed.analysisResults) ? parsed.analysisResults : null,
      callLogs: Array.isArray(parsed.callLogs) ? parsed.callLogs : [],
      workspaceTab,
    };
  } catch {
    return null;
  }
};

const Index = () => {
  const [persistedState] = useState<PersistedWorkflowState | null>(() => readPersistedWorkflowState());

  const [currentStep, setCurrentStep] = useState<Step>(persistedState?.currentStep ?? 'persona');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(persistedState?.selectedPersonas ?? []);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(persistedState?.selectedVehicle ?? null);
  const [features, setFeatures] = useState<Feature[]>(persistedState?.features ?? []);
  const [analysisResults, setAnalysisResults] = useState<Map<string, PerceivedValue[]> | null>(
    persistedState?.analysisResults ? new Map<string, PerceivedValue[]>(persistedState.analysisResults) : null
  );
  const [callLogs, setCallLogs] = useState<MaxDiffCallLog[]>(persistedState?.callLogs ?? []);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState(persistedState?.workspaceTab ?? "config");

  useEffect(() => {
    const serializable: PersistedWorkflowState = {
      currentStep,
      selectedPersonas,
      selectedVehicle,
      features,
      analysisResults: analysisResults ? Array.from(analysisResults.entries()) : null,
      callLogs,
      workspaceTab,
    };
    sessionStorage.setItem(WORKFLOW_SESSION_STORAGE_KEY, JSON.stringify(serializable));
  }, [analysisResults, callLogs, currentStep, features, selectedPersonas, selectedVehicle, workspaceTab]);

  const steps = [
    { id: 'persona', label: 'Select Persona', icon: Users, description: 'Choose target buyer persona' },
    { id: 'vehicle', label: 'Select Vehicle', icon: Car, description: 'Choose vehicle model' },
    { id: 'upload', label: 'Upload Features', icon: Upload, description: 'Upload feature data CSV' },
    { id: 'analysis', label: 'Run Analysis', icon: BarChart3, description: 'Execute MaxDiff analysis' },
    { id: 'results', label: 'View Results', icon: CheckCircle, description: 'Review value analysis' },
  ];

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);
  const isStepComplete = (step: Step) => {
    switch (step) {
      case 'persona': return selectedPersonas.length > 0;
      case 'vehicle': return selectedVehicle !== null;
      case 'upload': return features.length > 0;
      case 'analysis': return analysisResults !== null;
      case 'results': return analysisResults !== null;
      default: return false;
    }
  };

  const canProceedToStep = (step: Step) => {
    const stepIndex = getStepIndex(step);
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(steps[i].id as Step)) return false;
    }
    return true;
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id as Step;
      if (canProceedToStep(nextStepId)) {
        setCurrentStep(nextStepId);
      }
    }
  };

  const goToStep = (step: Step) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step);
    }
  };

  const lazyFallback = (
    <Card className="p-6">
      <p className="text-center text-muted-foreground">Loading step…</p>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'persona':
        return (
          <PersonaSelector
            selectedPersonas={selectedPersonas}
            onPersonaSelect={(personas) => {
              setSelectedPersonas(personas);
            }}
          />
        );
      case 'vehicle':
        return (
          <VehicleSelector
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(vehicle) => {
              setSelectedVehicle(vehicle);
            }}
          />
        );
      case 'upload':
        return (
          <Suspense fallback={lazyFallback}>
            <FeatureUpload
              features={features}
              onFeaturesUploaded={(newFeatures) => {
                setFeatures(newFeatures);
                setAnalysisResults(null);
                setCallLogs([]);
              }}
            />
          </Suspense>
        );
      case 'analysis':
        return (
          <Suspense fallback={lazyFallback}>
            <MaxDiffAnalysis
              features={features}
              selectedPersonas={selectedPersonas}
              selectedVehicle={selectedVehicle!}
              onAnalysisComplete={(results, logs) => {
                setAnalysisResults(results);
                setCallLogs(logs);
              }}
              onEditAnalysisParameters={() => {
                setWorkspaceTab('design');
                setWorkspaceOpen(true);
              }}
            />
          </Suspense>
        );
      case 'results':
        return analysisResults ? (
          <Suspense fallback={lazyFallback}>
            <ResultsVisualization
              results={analysisResults}
              callLogs={callLogs}
            />
          </Suspense>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Customer Clinic</h1>
              <p className="text-sm text-muted-foreground">MaxDiff Tradeoff Analysis Platform</p>
            </div>
            <div className="flex items-center gap-3">
              <BurgerMenu
                open={workspaceOpen}
                onOpenChange={setWorkspaceOpen}
                activeTab={workspaceTab}
                onTabChange={setWorkspaceTab}
                featureCount={features.length}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Analysis Workflow</CardTitle>
            <CardDescription>Complete each step to perform your MaxDiff analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isComplete = isStepComplete(step.id as Step);
                const isCurrent = currentStep === step.id;
                const canAccess = canProceedToStep(step.id as Step);

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => goToStep(step.id as Step)}
                      disabled={!canAccess}
                      className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                        isCurrent 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : isComplete
                          ? 'bg-data-positive text-white hover:bg-data-positive/90'
                          : canAccess
                          ? 'bg-muted hover:bg-muted/80 text-foreground'
                          : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">{step.label}</span>
                    </button>
                    
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
            
            <Progress 
              value={(getStepIndex(currentStep) + 1) / steps.length * 100} 
              className="h-2"
            />
            
            <div className="mt-2 text-center">
              <p className="text-sm text-muted-foreground">
                Step {getStepIndex(currentStep) + 1} of {steps.length}: {steps[getStepIndex(currentStep)]?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        {currentStep !== 'results' && (
          <div className="flex justify-center">
            <Button
              onClick={nextStep}
              disabled={!isStepComplete(currentStep)}
              variant="analytics"
              size="lg"
            >
              {currentStep === 'analysis' ? 'View Results' : 'Continue'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            AI Customer Clinic - Advanced MaxDiff Analysis for Automotive Features
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
