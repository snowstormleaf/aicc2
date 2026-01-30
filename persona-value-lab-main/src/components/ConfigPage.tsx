import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ApiKeyInput } from './ApiKeyInput';
import { Key, Brain, Zap, CheckCircle } from 'lucide-react';

interface ConfigPageProps {
  onClose?: () => void;
}

export const ConfigPage = ({ onClose }: ConfigPageProps) => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem('openai_api_key');
    setHasApiKey(!!apiKey);
  }, []);

  const handleApiKeySet = (apiKey: string) => {
    setHasApiKey(true);
    // Optional: show success message or auto-close
  };

  const configSections = [
    {
      id: 'api',
      title: 'OpenAI API Configuration',
      description: 'Set up your OpenAI API key for AI persona analysis',
      icon: Key,
      status: hasApiKey ? 'configured' : 'required',
      component: (
        <ApiKeyInput
          onApiKeySet={handleApiKeySet}
          hasApiKey={hasApiKey}
        />
      )
    },
    {
      id: 'analysis',
      title: 'Analysis Settings',
      description: 'Configure MaxDiff analysis parameters',
      icon: Brain,
      status: 'configured',
      component: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">MaxDiff Iterations</p>
              <p className="text-xs text-muted-foreground">Target appearances per feature: 30</p>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Voucher Generation</p>
              <p className="text-xs text-muted-foreground">AI-powered voucher bounds</p>
            </div>
            <Badge variant="outline">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cache Results</p>
              <p className="text-xs text-muted-foreground">Store analysis results locally</p>
            </div>
            <Badge variant="outline">Enabled</Badge>
          </div>
        </div>
      )
    },
    {
      id: 'performance',
      title: 'Performance Settings',
      description: 'Optimize analysis speed and reliability',
      icon: Zap,
      status: 'configured',
      component: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Retry Attempts</p>
              <p className="text-xs text-muted-foreground">API call retry limit</p>
            </div>
            <Badge variant="outline">3 retries</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Temperature</p>
              <p className="text-xs text-muted-foreground">AI response randomness</p>
            </div>
            <Badge variant="outline">0.2</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Progress Updates</p>
              <p className="text-xs text-muted-foreground">Real-time analysis tracking</p>
            </div>
            <Badge variant="outline">Enabled</Badge>
          </div>
        </div>
      )
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'bg-data-positive';
      case 'required': return 'bg-data-negative';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured': return 'Configured';
      case 'required': return 'Required';
      default: return 'Optional';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Status</CardTitle>
          <CardDescription>Configure your AI Customer Car Clinic session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {hasApiKey ? (
              <>
                <CheckCircle className="h-4 w-4 text-data-positive" />
                <span className="text-sm font-medium">Ready for Analysis</span>
                <Badge variant="outline" className="bg-data-positive/10 text-data-positive border-data-positive/20">
                  All systems go
                </Badge>
              </>
            ) : (
              <>
                <Key className="h-4 w-4 text-data-negative" />
                <span className="text-sm font-medium">API Key Required</span>
                <Badge variant="outline" className="bg-data-negative/10 text-data-negative border-data-negative/20">
                  Setup needed
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Sections */}
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
              <CardContent>
                {section.component}
              </CardContent>
            </Card>
            
            {index < configSections.length - 1 && (
              <Separator className="my-4" />
            )}
          </div>
        );
      })}

      {/* Actions */}
      {onClose && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={onClose}
            variant="analytics"
            disabled={!hasApiKey}
          >
            {hasApiKey ? 'Start Analysis' : 'Configure API Key First'}
          </Button>
        </div>
      )}
    </div>
  );
};