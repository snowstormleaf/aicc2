import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const statusText = isChecking
    ? 'Checking backend status...'
    : hasApiKey
      ? 'Backend key is configured.'
      : 'Set OPENAI_API_KEY on the backend and restart the service.';

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{statusText}</p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            {error} Restart the backend (`npm run dev:backend`) and verify `VITE_API_URL` points to that backend.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
