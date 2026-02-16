import { getStoredModelConfig, MODEL_PRICING } from '@/lib/model-pricing';
import { getStoredAnalysisSettings } from '@/lib/analysis-settings';

export type SetupCheckStatus = 'healthy' | 'warning' | 'error';

export interface SetupCheck {
  id: string;
  label: string;
  detail: string;
  status: SetupCheckStatus;
  required: boolean;
  guidance: string;
}

export interface SetupHealthResult {
  checks: SetupCheck[];
  ready: boolean;
  checkedAt: string;
}

const apiBaseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

const withTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 3500) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

const createCheck = (
  id: string,
  label: string,
  detail: string,
  status: SetupCheckStatus,
  required: boolean,
  guidance: string
): SetupCheck => ({ id, label, detail, status, required, guidance });

export const runSetupHealthChecks = async (): Promise<SetupHealthResult> => {
  const checks: SetupCheck[] = [];

  try {
    const response = await withTimeout(`${apiBaseUrl}/llm/status`, { method: 'GET' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.configured) {
      checks.push(createCheck(
        'api-key',
        'OpenAI API key',
        payload?.message || 'OPENAI_API_KEY is not configured on the backend.',
        'error',
        true,
        'Set OPENAI_API_KEY in your backend environment and restart the backend process.'
      ));
    } else {
      checks.push(createCheck(
        'api-key',
        'OpenAI API key',
        'Server-side OpenAI API key is configured.',
        'healthy',
        true,
        'No action needed.'
      ));
    }
  } catch (error) {
    checks.push(createCheck(
      'api-key',
      'OpenAI API key',
      `Unable to verify key status (${error instanceof Error ? error.message : 'Network error'}).`,
      'error',
      true,
      'Start backend and verify /api/llm/status is reachable.'
    ));
  }

  try {
    const response = await withTimeout(`${apiBaseUrl}/health`, { method: 'GET' });
    let payload: { status?: string; checks?: { database?: boolean }; error?: string; message?: string } | null = null;
    try {
      payload = (await response.json()) as { status?: string; checks?: { database?: boolean }; error?: string; message?: string };
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const backendReason = payload?.error || payload?.message;
      checks.push(
        createCheck(
          'backend-health',
          'Backend API health',
          backendReason
            ? `Health endpoint returned HTTP ${response.status} (${backendReason}).`
            : `Health endpoint returned HTTP ${response.status}.`,
          'error',
          true,
          'The frontend app can run while backend services are unhealthy. Ensure backend + database are healthy, restart backend (`npm run dev:backend`), and verify VITE_API_URL points to that backend.'
        )
      );
    } else {
      const dbOk = payload?.checks?.database === true;
      if (payload?.status === 'healthy' && dbOk) {
        checks.push(createCheck(
          'backend-health',
          'Backend API health',
          'API and database are healthy.',
          'healthy',
          true,
          'No action needed.'
        ));
      } else {
        checks.push(createCheck(
          'backend-health',
          'Backend API health',
          'API reachable but reported unhealthy status.',
          'error',
          true,
          'The UI can still load in this state. Check backend logs for database initialization errors and restart backend/database services.'
        ));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    checks.push(createCheck(
      'backend-health',
      'Backend API health',
      `Cannot reach backend health endpoint (${message}).`,
      'error',
      true,
      'Start backend (`npm run dev:backend`) and confirm VITE_API_URL matches that server address.'
    ));
  }

  try {
    const [personaResp, vehicleResp] = await Promise.all([
      withTimeout(`${apiBaseUrl}/personas`, { method: 'GET' }, 3500),
      withTimeout(`${apiBaseUrl}/vehicles`, { method: 'GET' }, 3500),
    ]);

    if (personaResp.ok && vehicleResp.ok) {
      checks.push(createCheck(
        'data-services',
        'Persona/Vehicle services',
        'Both data services are reachable.',
        'healthy',
        true,
        'No action needed.'
      ));
    } else {
      const statuses = `personas=${personaResp.status}, vehicles=${vehicleResp.status}`;
      checks.push(createCheck(
        'data-services',
        'Persona/Vehicle services',
        `One or more data endpoints failed (${statuses}).`,
        'error',
        true,
        'Verify backend endpoint paths and ensure persona/vehicle routes are available in the backend service.'
      ));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    checks.push(createCheck(
      'data-services',
      'Persona/Vehicle services',
      `Could not verify data endpoints (${message}).`,
      'error',
      true,
      'Check backend connectivity and CORS configuration, then rerun setup checks.'
    ));
  }

  const modelConfig = getStoredModelConfig();
  if (MODEL_PRICING[modelConfig.serviceTier]?.[modelConfig.model]) {
    checks.push(
      createCheck(
        'model-config',
        'Model configuration',
        `${modelConfig.model} on ${modelConfig.serviceTier} tier is configured.`,
        'healthy',
        true,
        'No action needed.'
      )
    );
  } else {
    checks.push(createCheck(
      'model-config',
      'Model configuration',
      'Stored model configuration is invalid.',
      'error',
      true,
      'Open Workspace > Analysis Parameters and re-select the model and service tier.'
    ));
  }

  const analysisSettings = getStoredAnalysisSettings();
  checks.push(
    createCheck(
      'analysis-settings',
      'Analysis settings',
      `Retries: ${analysisSettings.maxRetries}, temperature: ${analysisSettings.temperature.toFixed(1)}.`,
      'healthy',
      false,
      'Adjust retries/temperature and toggle behavior in Workspace > Configuration > Analysis Settings.'
    )
  );

  const ready = checks.every((check) => !check.required || check.status === 'healthy');

  return {
    checks,
    ready,
    checkedAt: new Date().toISOString(),
  };
};
