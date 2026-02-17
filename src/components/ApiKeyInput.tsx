import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, ExternalLink } from "lucide-react";

interface ApiKeyInputProps {
  onApiKeySet: (ready: boolean) => void;
  hasApiKey: boolean;
}

const apiBaseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

export const ApiKeyInput = ({ onApiKeySet, hasApiKey }: ApiKeyInputProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkServerKey = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/llm/status`);
      if (!response.ok) {
        throw new Error(`Unable to verify OpenAI configuration (HTTP ${response.status})`);
      }
      const payload = await response.json();
      onApiKeySet(Boolean(payload?.configured));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify key status');
      onApiKeySet(false);
    } finally {
      setIsChecking(false);
    }
  }, [onApiKeySet]);

  useEffect(() => {
    checkServerKey();
  }, [checkServerKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Server-side OpenAI Key
        </CardTitle>
        <CardDescription>
          Configure <code>OPENAI_API_KEY</code> on the backend process. The browser never stores or sends the key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            Current status: <strong>{isChecking ? 'Checking…' : hasApiKey ? 'Configured on server' : 'Missing on server'}</strong>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert>
            <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            Set <code>OPENAI_API_KEY</code> before running AI actions. See server env setup in project docs.
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center underline">
              OpenAI keys <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
