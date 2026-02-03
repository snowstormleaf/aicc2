/**
 * Generic HTTP client for API communication
 * Handles base URL, headers, error handling, and response parsing
 */

export interface FetchOptions extends RequestInit {
  data?: unknown;
}

export class HttpClient {
  constructor(private baseUrl: string) {}

  async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { data, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    const body = data ? JSON.stringify(data) : undefined;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return (await response.json()) as T;
      }

      return undefined as T;
    } catch (error) {
      console.error(`[HttpClient] Error at ${url}:`, error);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', data });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
