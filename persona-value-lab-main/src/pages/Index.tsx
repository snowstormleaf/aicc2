import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PersonaSelector } from "@/components/PersonaSelector";
import { VehicleSelector } from "@/components/VehicleSelector";
import { FeatureUpload } from "@/components/FeatureUpload";
import { MaxDiffAnalysis } from "@/components/MaxDiffAnalysis";
import { ResultsVisualization } from "@/components/ResultsVisualization";
import { PerceivedValue } from "@/lib/maxdiff-engine";
import { BurgerMenu } from "@/components/BurgerMenu";
import { Car, Users, Upload, BarChart3, CheckCircle, ArrowRight, type LucideIcon } from "lucide-react";

interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

type Step = 'persona' | 'vehicle' | 'upload' | 'analysis' | 'results';

interface StepConfig {
  id: Step;
  label: string;
  icon: LucideIcon;
  description: string;
}

const steps: StepConfig[] = [
  { id: 'persona', label: 'Select Persona', icon: Users, description: 'Choose target buyer persona' },
  { id: 'vehicle', label: 'Select Vehicle', icon: Car, description: 'Choose vehicle model' },
  { id: 'upload', label: 'Upload Features', icon: Upload, description: 'Upload feature data CSV' },
  { id: 'analysis', label: 'Run Analysis', icon: BarChart3, description: 'Execute MaxDiff analysis' },
  { id: 'results', label: 'View Results', icon: CheckCircle, description: 'Review value analysis' },
];

const getStepIndex = (step: Step) => steps.findIndex((item) => item.id === step);

const getStepFromState = ({
  personas,
  vehicle,
  features,
  analysisResults,
}: {
  personas: string[];
  vehicle: string | null;
  features: Feature[];
  analysisResults: Map<string, PerceivedValue[]> | null;
}): Step => {
  if (analysisResults) {
    return 'results';
  }

  if (personas.length > 0 && vehicle && features.length > 0) {
    return 'analysis';
  }

  if (personas.length > 0 && vehicle) {
    return 'upload';
  }

  if (personas.length > 0) {
    return 'vehicle';
  }

  return 'persona';
};

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>('persona');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Map<string, PerceivedValue[]> | null>(null);

  const resetAnalysisAndStep = ({
    personas = selectedPersonas,
    vehicle = selectedVehicle,
    nextFeatures = features,
  }: {
    personas?: string[];
    vehicle?: string | null;
    nextFeatures?: Feature[];
  }) => {
    if (analysisResults) {
      setAnalysisResults(null);
    }

    setCurrentStep(getStepFromState({
      personas,
      vehicle,
      features: nextFeatures,
      analysisResults: null,
    }));
  };

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
      if (!isStepComplete(steps[i].id)) return false;
    }
    return true;
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id;
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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'persona':
        return (
          <PersonaSelector
            selectedPersonas={selectedPersonas}
            onPersonaSelect={(personas) => {
              setSelectedPersonas(personas);
              resetAnalysisAndStep({ personas });
            }}
          />
        );
      case 'vehicle':
        return (
          <VehicleSelector
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(vehicle) => {
              setSelectedVehicle(vehicle);
              resetAnalysisAndStep({ vehicle });
            }}
          />
        );
      case 'upload':
        return (
          <FeatureUpload
            features={features}
            onFeaturesUploaded={(newFeatures) => {
              setFeatures(newFeatures);
              resetAnalysisAndStep({ nextFeatures: newFeatures });
            }}
          />
        );
      case 'analysis':
        if (!selectedVehicle) {
          return null;
        }
        return (
          <MaxDiffAnalysis
            features={features}
            selectedPersonas={selectedPersonas}
            selectedVehicle={selectedVehicle}
            onAnalysisComplete={(results) => {
              setAnalysisResults(results);
              setCurrentStep('results');
            }}
          />
        );
      case 'results':
        return analysisResults ? (
          <ResultsVisualization
            results={analysisResults}
          />
        ) : null;
      default:
        return null;
    }
  };

  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Customer Car Clinic</h1>
              <p className="text-sm text-muted-foreground">MaxDiff Tradeoff Analysis Platform</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                Powered by AI Personas
              </Badge>
              <BurgerMenu />
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
                const isComplete = isStepComplete(step.id);
                const isCurrent = currentStep === step.id;
                const canAccess = canProceedToStep(step.id);

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => goToStep(step.id)}
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
              value={(currentStepIndex + 1) / steps.length * 100} 
              className="h-2"
            />
            
            <div className="mt-2 text-center">
              <p className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.description}
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
            AI Customer Car Clinic - Advanced MaxDiff Analysis for Automotive Features
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
