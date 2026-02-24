import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, Car, CheckCircle2, Upload, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { BurgerMenu } from "@/components/BurgerMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PersonaSelector } from "@/components/PersonaSelector";
import { VehicleSelector } from "@/components/VehicleSelector";
import { PerceivedValue } from "@/lib/maxdiff-engine";
import type { MaxDiffCallLog, MaxDiffMethodSummary } from "@/types/analysis";
import { useWorkspaceStore } from "@/store/workspaceStore";

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

type Step = "persona" | "vehicle" | "upload" | "analysis" | "results";

const WORKFLOW_SESSION_STORAGE_KEY = "analysis_workflow_state";

type PersistedWorkflowState = {
  currentStep: Step;
  selectedPersonas: string[];
  selectedVehicle: string | null;
  features: Feature[];
  analysisResults: Array<[string, PerceivedValue[]]> | null;
  callLogs: MaxDiffCallLog[];
  methodSummaries: MaxDiffMethodSummary[];
  workspaceTab: string;
};

const readPersistedWorkflowState = (): PersistedWorkflowState | null => {
  try {
    const raw = sessionStorage.getItem(WORKFLOW_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkflowState>;
    if (!parsed || typeof parsed !== "object") return null;

    const validSteps: Step[] = ["persona", "vehicle", "upload", "analysis", "results"];
    const step = validSteps.includes(parsed.currentStep as Step) ? (parsed.currentStep as Step) : "persona";
    const validWorkspaceTabs = ["config", "design", "filters"];
    const workspaceTab =
      typeof parsed.workspaceTab === "string" && validWorkspaceTabs.includes(parsed.workspaceTab)
        ? parsed.workspaceTab
        : "config";

    return {
      currentStep: step,
      selectedPersonas: Array.isArray(parsed.selectedPersonas) ? parsed.selectedPersonas : [],
      selectedVehicle: typeof parsed.selectedVehicle === "string" ? parsed.selectedVehicle : null,
      features: Array.isArray(parsed.features) ? parsed.features : [],
      analysisResults: Array.isArray(parsed.analysisResults) ? parsed.analysisResults : null,
      callLogs: Array.isArray(parsed.callLogs) ? parsed.callLogs : [],
      methodSummaries: Array.isArray(parsed.methodSummaries) ? parsed.methodSummaries : [],
      workspaceTab,
    };
  } catch {
    return null;
  }
};

const Index = () => {
  const [persistedState] = useState<PersistedWorkflowState | null>(() => readPersistedWorkflowState());

  const [currentStep, setCurrentStep] = useState<Step>(persistedState?.currentStep ?? "persona");
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(persistedState?.selectedPersonas ?? []);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(persistedState?.selectedVehicle ?? null);
  const [features, setFeatures] = useState<Feature[]>(persistedState?.features ?? []);
  const [analysisResults, setAnalysisResults] = useState<Map<string, PerceivedValue[]> | null>(
    persistedState?.analysisResults ? new Map<string, PerceivedValue[]>(persistedState.analysisResults) : null
  );
  const [callLogs, setCallLogs] = useState<MaxDiffCallLog[]>(persistedState?.callLogs ?? []);
  const [methodSummaries, setMethodSummaries] = useState<MaxDiffMethodSummary[]>(persistedState?.methodSummaries ?? []);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState(persistedState?.workspaceTab ?? "config");
  const appliedBrands = useWorkspaceStore((state) => state.appliedBrands);
  const previousAppliedBrands = useRef<string | null>(null);

  useEffect(() => {
    const serializable: PersistedWorkflowState = {
      currentStep,
      selectedPersonas,
      selectedVehicle,
      features,
      analysisResults: analysisResults ? Array.from(analysisResults.entries()) : null,
      callLogs,
      methodSummaries,
      workspaceTab,
    };
    sessionStorage.setItem(WORKFLOW_SESSION_STORAGE_KEY, JSON.stringify(serializable));
  }, [analysisResults, callLogs, currentStep, features, methodSummaries, selectedPersonas, selectedVehicle, workspaceTab]);

  useEffect(() => {
    const serialized = JSON.stringify(appliedBrands);
    if (previousAppliedBrands.current == null) {
      previousAppliedBrands.current = serialized;
      return;
    }

    if (serialized === previousAppliedBrands.current) {
      return;
    }

    previousAppliedBrands.current = serialized;
    setSelectedPersonas([]);
    setSelectedVehicle(null);
    setAnalysisResults(null);
    setCallLogs([]);
    setCurrentStep("persona");
    setMethodSummaries([]);
  }, [appliedBrands]);

  const steps = useMemo(
    () => [
      { id: "persona", label: "Select Persona", icon: Users, description: "Choose target buyer persona" },
      { id: "vehicle", label: "Select Vehicle", icon: Car, description: "Choose vehicle model" },
      { id: "upload", label: "Upload Features", icon: Upload, description: "Upload feature data CSV/XLSX" },
      { id: "analysis", label: "Run Analysis", icon: BarChart3, description: "Execute MaxDiff analysis" },
      { id: "results", label: "View Results", icon: CheckCircle2, description: "Review value outcomes" },
    ],
    []
  );

  const getStepIndex = (step: Step) => steps.findIndex((s) => s.id === step);

  const isStepComplete = (step: Step) => {
    switch (step) {
      case "persona":
        return selectedPersonas.length > 0;
      case "vehicle":
        return selectedVehicle !== null;
      case "upload":
        return features.length > 0;
      case "analysis":
      case "results":
        return analysisResults !== null;
      default:
        return false;
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
      <p className="text-center text-muted-foreground">Loading section...</p>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "persona":
        return (
          <PersonaSelector
            selectedPersonas={selectedPersonas}
            onPersonaSelect={(personas) => {
              setSelectedPersonas(personas);
            }}
          />
        );
      case "vehicle":
        return (
          <VehicleSelector
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(vehicle) => {
              setSelectedVehicle(vehicle);
            }}
          />
        );
      case "upload":
        return (
          <Suspense fallback={lazyFallback}>
            <FeatureUpload
              features={features}
              onFeaturesUploaded={(newFeatures) => {
                setFeatures(newFeatures);
                setAnalysisResults(null);
                setCallLogs([]);
                setMethodSummaries([]);
              }}
            />
          </Suspense>
        );
      case "analysis":
        return (
          <Suspense fallback={lazyFallback}>
            <MaxDiffAnalysis
              features={features}
              selectedPersonas={selectedPersonas}
              selectedVehicle={selectedVehicle!}
              onAnalysisComplete={(results, logs, summaries) => {
                setAnalysisResults(results);
                setCallLogs(logs);
                setMethodSummaries(summaries);
                setCurrentStep("results");
              }}
              onEditAnalysisParameters={() => {
                setWorkspaceTab("design");
                setWorkspaceOpen(true);
              }}
            />
          </Suspense>
        );
      case "results":
        return analysisResults ? (
          <Suspense fallback={lazyFallback}>
            <ResultsVisualization results={analysisResults} callLogs={callLogs} methodSummaries={methodSummaries} />
          </Suspense>
        ) : null;
      default:
        return null;
    }
  };

  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="page-shell">
      <PageHeader
        actions={
          <BurgerMenu
            open={workspaceOpen}
            onOpenChange={setWorkspaceOpen}
            activeTab={workspaceTab}
            onTabChange={setWorkspaceTab}
            featureCount={features.length}
          />
        }
      />

      <main className="container mx-auto space-y-8 pb-16 pt-8">
        <section id="workflow" className="section-frame space-y-5" aria-labelledby="workflow-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 id="workflow-title" className="type-headline">
                Analysis Workflow
              </h2>
              <p className="type-deck content-measure">
                Complete each module in sequence. Completed modules are retained in this session.
              </p>
            </div>
            <Badge variant="selected" className="h-fit">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </div>

          <ol className="flex flex-col gap-3 lg:flex-row lg:items-stretch" aria-label="Workflow steps">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = isStepComplete(step.id as Step);
              const isCurrent = currentStep === step.id;
              const canAccess = canProceedToStep(step.id as Step);
              const statusLabel = isComplete ? "Completed" : isCurrent ? "In Progress" : "Pending";
              const statusTone = isComplete
                ? "text-primary"
                : isCurrent
                ? "text-foreground"
                : "text-muted-foreground";

              return (
                <li key={step.id} className="flex items-stretch gap-2 lg:flex-1">
                  <button
                    type="button"
                    onClick={() => goToStep(step.id as Step)}
                    disabled={!canAccess}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex h-full min-h-[170px] w-full flex-col rounded-lg border px-3 py-3 text-left transition-all duration-200 ${
                      isCurrent
                        ? "border-primary/40 bg-primary/10 shadow-subtle"
                        : isComplete
                        ? "border-primary/35 bg-primary/5 shadow-subtle"
                        : canAccess
                        ? "border-border-subtle bg-surface hover:border-border"
                        : "cursor-not-allowed border-border-subtle bg-muted/45 opacity-70"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-background">
                        <Icon className="h-4 w-4" />
                      </span>
                      {isComplete ? (
                        <Badge variant="selected" className="text-[10px] uppercase tracking-wide">
                          Completed
                        </Badge>
                      ) : isCurrent ? (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          Step {index + 1}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                    <p className={`mt-auto pt-3 inline-flex items-center gap-1 text-xs font-semibold ${statusTone}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${isComplete ? "opacity-100" : "opacity-0"}`} />
                      {statusLabel}
                    </p>
                  </button>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      className="hidden h-5 w-5 shrink-0 self-center text-muted-foreground lg:block"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-2" />
        </section>

        <section id="run-hub" aria-live="polite">
          {renderCurrentStep()}
        </section>

        {currentStep !== "results" && (
          <div className="flex justify-center">
            <Button onClick={nextStep} disabled={!isStepComplete(currentStep)} variant="analytics" size="lg">
              {currentStep === "analysis" ? "View Results" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-border-subtle bg-surface py-8">
        <div className="container mx-auto flex flex-col gap-2 text-center">
          <p className="text-sm font-semibold text-foreground">AI Customer Clinic</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
