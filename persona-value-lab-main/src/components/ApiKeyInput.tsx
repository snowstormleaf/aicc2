import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Eye, EyeOff, ExternalLink } from "lucide-react";

interface ApiKeyInputProps {
  onApiKeySet: (apiKey: string) => void;
  hasApiKey: boolean;
}

export const ApiKeyInput = ({ onApiKeySet, hasApiKey }: ApiKeyInputProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsValidating(true);
    
    // Basic validation - check if it starts with 'sk-'
    if (!apiKey.startsWith('sk-')) {
      setIsValidating(false);
      alert('Invalid API key format. OpenAI API keys start with "sk-"');
      return;
    }

    // Store in localStorage and notify parent
    localStorage.setItem('openai_api_key', apiKey);
    onApiKeySet(apiKey);
    setIsValidating(false);
  };

  const handleClear = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    onApiKeySet('');
  };

  if (hasApiKey) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-data-positive" />
            API Key Configured
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              OpenAI API key is ready for analysis
            </span>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear Key
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          OpenAI API Key Required
        </CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable AI-powered MaxDiff analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Your API key is stored locally</strong> in your browser and never sent to our servers. 
            It's only used to make direct requests to OpenAI's API.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button type="submit" disabled={!apiKey.trim() || isValidating}>
              {isValidating ? 'Validating...' : 'Set API Key'}
            </Button>
            
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
              className="text-xs"
            >
              Get API Key <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </form>

        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            The analysis will make multiple API calls to OpenAI. Estimated cost: $2-10 depending on the number of features.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};