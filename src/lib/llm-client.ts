import { MaxDiffSet, RawResponse } from './maxdiff-engine';

export interface LLMConfig {
  model?: string;
  reasoningModel?: string;
  serviceTier?: 'standard' | 'flex';
  maxRetries?: number;
  temperature?: number;
  useGPT?: boolean;
  maxOutputTokens?: number;
}

const BEST_WORST_TOOL = {
  type: "function",
  name: "submit_best_worst",
  description: "Submit exactly one best option id and one worst option id for the current set.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      best: { type: "string", description: "Option id selected as BEST." },
      worst: { type: "string", description: "Option id selected as WORST." },
    },
    required: ["best", "worst"],
  },
} as const;

const FEATURE_CASH_TOOL = {
  type: "function",
  name: "submit_feature_vs_cash_choice",
  description: "Choose A for feature or B for cash price reduction.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      choice: {
        type: "string",
        enum: ["A", "B"],
        description: "A means choose feature, B means choose price reduction.",
      },
    },
    required: ["choice"],
  },
} as const;

export interface VoucherBounds {
  min_discount: number;
  max_discount: number;
  levels: number;
}

export interface PersonaProfile {
  id: string;
  name: string;
  summary?: string;
  attributes: Record<string, string>;
  demographics: {
    age: string;
    income: string;
    family: string;
    location: string;
  };
  motivations: string[];
  painPoints: string[];
  buyingBehavior: string[];
}

export const buildVoucherPrompt = (featureDescriptions: Map<string, string>): string => {
  const featuresBlock = Array.from(featureDescriptions.entries())
    .map(([title, desc]) => `- ${title}: ${desc || 'No description available'}`)
    .join('\n');

  return `You are an automotive pricing expert. You have to estimate what is the conservative boundaries for the willingness-to-pay for these feature individually max and min:

${featuresBlock}

Recommend (in USD) a minimum and maximum voucher discount, and how many distinct voucher levels to include.
Respond with **pure JSON only**, for example:
{"min_discount":10,"max_discount":200,"levels":6}`;
};

export const buildSystemPrompt = (persona: PersonaProfile): string => {
  const summaryBlock = persona.summary ? `\nPERSONA SUMMARY:\n${persona.summary}\n` : "";
  return `You are a ${persona.name} persona with the following characteristics:

DEMOGRAPHICS:
- Age: ${persona.demographics.age}
- Income: ${persona.demographics.income}
- Family: ${persona.demographics.family}
- Location: ${persona.demographics.location}

MOTIVATIONS:
${persona.motivations.map(m => `- ${m}`).join('\n')}

PAIN POINTS:
${persona.painPoints.map(p => `- ${p}`).join('\n')}

BUYING BEHAVIOR:
${persona.buyingBehavior.map(b => `- ${b}`).join('\n')}
${summaryBlock}

INSTRUCTIONS:
- Think and respond ONLY as this persona
- Consider your specific needs, budget constraints, and priorities
- Make decisions based on your demographic profile and motivations
- Do NOT reveal your thought process or mention that you are an AI
- Be consistent with your persona's characteristics throughout
- Focus on practical value from your persona's perspective
- For MaxDiff choice tasks, output strict JSON only when asked.`;
};

export const buildUserPrompt = (
  set: MaxDiffSet,
  vehicle: { brand: string; name: string; description?: string },
  featureDescriptions: Map<string, string>,
  persona: Pick<PersonaProfile, 'name' | 'id' | 'summary'>,
  mode: 'default' | 'json_only' | 'minimal' = 'default'
): string => {
  if (mode === 'minimal') {
    const ids = set.options.map((option) => option.id).join(', ');
    return `Return JSON only: {"best":"<id>","worst":"<id>"}.
Set ${set.id} option IDs: ${ids}`;
  }

  const optionsText = set.options.map((option, index) => {
    const description = featureDescriptions.get(option.id) || option.description || 'No description available';
    return `${index + 1}. ${option.name} (ID: ${option.id})
   ${description}`;
  }).join('\n\n');

  const personaSummary = persona.summary
    ? `Persona summary: ${persona.summary}`
    : `Persona summary: ${persona.name} evaluating value and affordability tradeoffs.`;
  const vehicleContext = vehicle.description
    ? `${vehicle.brand} ${vehicle.name}. Context: ${vehicle.description}`
    : `${vehicle.brand} ${vehicle.name}`;
  const jsonOnlyReminder =
    mode === 'json_only'
      ? '\nCRITICAL: Return JSON only, no markdown, no prose, no code fences.'
      : '';

  return `You are ${persona.name}. ${personaSummary}
Vehicle context: ${vehicleContext}
Baseline: all other vehicle attributes remain fixed; only one option below is selected.

Evaluate these 4 options:

${optionsText}

If an option is monetary, interpret it as a PRICE REDUCTION on purchase price (not a gift card, not free cash).
Assume any feature can be turned off; if a feature is not valuable, treat it as neutral rather than harmful.
Choose:
- "best": the single most valuable option for you.
- "worst": the single least valuable option for you.

Respond with strict JSON only:
{"best":"<option_id>","worst":"<option_id>"}
${jsonOnlyReminder}`;
};

export const buildCalibrationPrompt = (params: {
  featureId: string;
  featureName: string;
  featureDescription?: string;
  amount: number;
  vehicle: { brand: string; name: string; description?: string };
  persona: Pick<PersonaProfile, 'name' | 'summary'>;
}): string => {
  const featureText = params.featureDescription?.trim()
    ? `${params.featureName} (${params.featureId}): ${params.featureDescription}`
    : `${params.featureName} (${params.featureId})`;
  const personaSummary = params.persona.summary
    ? `${params.persona.name}. ${params.persona.summary}`
    : params.persona.name;
  const vehicleText = params.vehicle.description
    ? `${params.vehicle.brand} ${params.vehicle.name} (${params.vehicle.description})`
    : `${params.vehicle.brand} ${params.vehicle.name}`;
  const amount = Math.max(0, Number(params.amount));

  return `Persona: ${personaSummary}
Vehicle context: ${vehicleText}
Baseline fixed: all other features and conditions remain unchanged.

Choose exactly one option:
A) Add this feature: ${featureText}
B) Receive a $${amount.toFixed(2)} PRICE REDUCTION on the vehicle purchase price.

Respond with strict JSON only:
{"choice":"A"} or {"choice":"B"}`;
};

const extractJsonPayload = (raw: string): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{.*\}/s);
    if (!match) return null;
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
};

const parseJsonLike = (rawValue: unknown): Record<string, unknown> => {
  if (!rawValue) return {};
  if (typeof rawValue === 'string') {
    return extractJsonPayload(rawValue) ?? {};
  }
  if (typeof rawValue === 'object') {
    return rawValue as Record<string, unknown>;
  }
  return {};
};

const extractStructuredPayloadFromResponse = (response: Record<string, unknown>): Record<string, unknown> => {
  const outputText = extractOutputText(response);
  const parsedText = extractJsonPayload(outputText);
  if (parsedText) return parsedText;

  const output = response.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const typedItem = item as Record<string, unknown>;
      const type = typedItem.type;
      if (type === 'tool_call' || type === 'function_call') {
        const fromArgs = parseJsonLike(typedItem.arguments);
        if (Object.keys(fromArgs).length > 0) {
          return fromArgs.arguments && typeof fromArgs.arguments === 'object'
            ? (fromArgs.arguments as Record<string, unknown>)
            : fromArgs;
        }
      }
      if (typedItem.tool_call && typeof typedItem.tool_call === 'object') {
        const toolCall = typedItem.tool_call as Record<string, unknown>;
        const fromArgs = parseJsonLike(toolCall.arguments);
        if (Object.keys(fromArgs).length > 0) {
          return fromArgs.arguments && typeof fromArgs.arguments === 'object'
            ? (fromArgs.arguments as Record<string, unknown>)
            : fromArgs;
        }
      }
    }
  }

  return {};
};

const extractOutputText = (response: Record<string, unknown>): string => {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }
  const output = response.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const typedItem = item as Record<string, unknown>;
      if (typedItem.type === 'message' && Array.isArray(typedItem.content)) {
        for (const contentPart of typedItem.content) {
          if (!contentPart || typeof contentPart !== 'object') continue;
          const typedContent = contentPart as Record<string, unknown>;
          if (typedContent.type === 'output_text' && typeof typedContent.text === 'string') {
            return typedContent.text;
          }
          if (typedContent.type === 'text' && typeof typedContent.text === 'string') {
            return typedContent.text;
          }
        }
      }
    }
  }
  return '';
};

const normalizeTemperature = (temperature: number | undefined): number | undefined => {
  if (temperature == null) return undefined;
  return clamp(Number(temperature), 0, 2);
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const mapServiceTier = (serviceTier?: 'standard' | 'flex'): string | undefined => {
  if (serviceTier === 'flex') return 'flex';
  if (serviceTier === 'standard') return 'default';
  return undefined;
};

const apiBaseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

const parseBestWorstPayload = (payload: Record<string, unknown>) => {
  const best = payload.best ?? payload.most_valued ?? payload.mostValued ?? payload.most;
  const worst = payload.worst ?? payload.least_valued ?? payload.leastValued ?? payload.least;

  if (typeof best !== 'string' || typeof worst !== 'string') {
    throw new Error(`Missing best/worst keys in model output: ${JSON.stringify(payload)}`);
  }
  if (!best.trim() || !worst.trim()) {
    throw new Error(`best/worst must be non-empty strings: ${JSON.stringify(payload)}`);
  }

  return {
    best: best.trim(),
    worst: worst.trim(),
  };
};

const parseFeatureCashPayload = (payload: Record<string, unknown>) => {
  const choice = payload.choice;
  if (choice !== "A" && choice !== "B") {
    throw new Error(`Expected {"choice":"A"|"B"}, received: ${JSON.stringify(payload)}`);
  }
  return { choice };
};

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      model: 'gpt-4.1-mini-2025-04-14',
      reasoningModel: 'o4-mini-2025-04-16',
      serviceTier: 'standard',
      maxRetries: 3,
      temperature: 0,
      useGPT: true,
      ...config
    };
  }

  async recommendVoucherBounds(
    featureDescriptions: Map<string, string>,
    defaultMin: number = 10,
    defaultMax: number = 200,
    defaultLevels: number = 6
  ): Promise<VoucherBounds> {
    const prompt = buildVoucherPrompt(featureDescriptions);

    try {
      const response = await fetch(`${apiBaseUrl}/llm/voucher-bounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.reasoningModel,
          prompt,
          max_output_tokens: 400,
          service_tier: mapServiceTier(this.config.serviceTier),
          temperature: normalizeTemperature(this.config.temperature),
          top_p: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = extractOutputText(data).trim();

      if (!content) {
        throw new Error('Empty response content');
      }

      // Extract JSON if wrapped in prose
      let jsonText = content;
      if (!content.startsWith('{')) {
        const match = content.match(/\{.*\}/s);
        if (match) {
          jsonText = match[0];
        } else {
          throw new Error('No JSON object found');
        }
      }

      const result = JSON.parse(jsonText);
      const minDiscount = Math.round(result.min_discount || defaultMin);
      const maxDiscount = Math.round(result.max_discount || defaultMax);
      const levels = Math.round(result.levels || defaultLevels);

      if (minDiscount < 0 || maxDiscount < minDiscount) {
        throw new Error(`Invalid bounds: ${minDiscount}-${maxDiscount}`);
      }

      return { min_discount: minDiscount, max_discount: maxDiscount, levels };
    } catch (error) {
      console.warn('Voucher bounds API call failed:', error, 'Using defaults.');
      return { min_discount: defaultMin, max_discount: defaultMax, levels: defaultLevels };
    }
  }

  /**
   * Generate AI persona response for MaxDiff set (Section 3.3)
   */
  async rankOptions(
    set: MaxDiffSet,
    persona: PersonaProfile,
    vehicle: { brand: string; name: string; description?: string },
    featureDescriptions: Map<string, string>
  ): Promise<RawResponse> {
    const systemPrompt = buildSystemPrompt(persona);
    const model = this.config.model ?? 'gpt-4.1-mini-2025-04-14';
    let tokenCap = this.config.maxOutputTokens ?? 1024;
    let temperature = normalizeTemperature(this.config.temperature);
    let serviceTier = mapServiceTier(this.config.serviceTier);
    const isModelGpt5 = model.startsWith('gpt-5');
    if (isModelGpt5) {
      if (model.includes('nano')) {
        tokenCap = Math.max(tokenCap, 4048);
      } else if (model.includes('mini')) {
        tokenCap = Math.max(tokenCap, 2024);
      } else {
        tokenCap = Math.max(tokenCap, 1024);
      }
    }

    const attemptModes: Array<'default' | 'json_only' | 'minimal'> = ['default', 'json_only', 'minimal'];
    const maxAttempts = Math.max(this.config.maxRetries ?? 3, attemptModes.length);
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const mode = attemptModes[Math.min(attempt - 1, attemptModes.length - 1)];
        const userPrompt = buildUserPrompt(set, vehicle, featureDescriptions, persona, mode);
        const requestPayload: Record<string, unknown> = {
          model,
          instructions: systemPrompt,
          input: userPrompt,
          max_output_tokens: tokenCap,
          top_p: 1,
          tools: [BEST_WORST_TOOL],
          tool_choice: {
            type: "function",
            name: BEST_WORST_TOOL.name,
          },
          ...(serviceTier ? { service_tier: serviceTier } : {}),
          ...(temperature != null ? { temperature } : {}),
        };

        const response = await fetch(`${apiBaseUrl}/llm/rank-options`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${errText}`);
        }

        const data = await response.json();
        const payload = extractStructuredPayloadFromResponse(data);
        if (!payload || Object.keys(payload).length === 0) {
          const reason = (data.incomplete_details as { reason?: string } | undefined)?.reason;
          if (reason === 'max_output_tokens') {
            throw new Error('max_output_tokens exhausted');
          }
          throw new Error('empty JSON payload from model');
        }

        const parsed = parseBestWorstPayload(payload);
        if (!set.options.some((option) => option.id === parsed.best)) {
          throw new Error(`Invalid "best" id "${parsed.best}" for set ${set.id}`);
        }
        if (!set.options.some((option) => option.id === parsed.worst)) {
          throw new Error(`Invalid "worst" id "${parsed.worst}" for set ${set.id}`);
        }
        if (parsed.best === parsed.worst) {
          throw new Error(`best and worst cannot be the same: ${parsed.best}`);
        }

        return {
          setId: set.id,
          personaId: persona.id,
          mostValued: parsed.best,
          leastValued: parsed.worst,
          ranking: [parsed.best, parsed.worst],
          debugTrace: {
            request: requestPayload,
            response: data as Record<string, unknown>,
          },
        };
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);

        const message = String(error).toLowerCase();
        if (message.includes('temperature') && message.includes('unsupported')) {
          temperature = undefined;
        }
        if (serviceTier && message.includes('service_tier') && message.includes('invalid')) {
          serviceTier = undefined;
        }
        if (serviceTier === 'flex' && message.includes('flex') && message.includes('unavailable')) {
          serviceTier = 'default';
        }
        if ((message.includes('truncated') || message.includes('max_output_tokens')) && tokenCap < 4096) {
          tokenCap = Math.min(4096, Math.max(tokenCap * 2, tokenCap + 320));
        }
        
        if (attempt === maxAttempts) break;
        
        // Linear backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');
    throw new Error(`Failed to rank options after ${maxAttempts} attempts: ${reason}`);
  }

  async chooseFeatureVsCash(
    persona: PersonaProfile,
    vehicle: { brand: string; name: string; description?: string },
    input: {
      featureId: string;
      featureName: string;
      featureDescription?: string;
      amount: number;
    }
  ): Promise<{ choice: "A" | "B"; debugTrace?: { request: Record<string, unknown>; response: Record<string, unknown> } }> {
    const model = this.config.model ?? 'gpt-4.1-mini-2025-04-14';
    let tokenCap = this.config.maxOutputTokens ?? 600;
    let temperature = normalizeTemperature(this.config.temperature);
    let serviceTier = mapServiceTier(this.config.serviceTier);
    const systemPrompt = buildSystemPrompt(persona);
    const prompt = buildCalibrationPrompt({
      featureId: input.featureId,
      featureName: input.featureName,
      featureDescription: input.featureDescription,
      amount: input.amount,
      vehicle,
      persona,
    });

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= Math.max(2, this.config.maxRetries ?? 3); attempt++) {
      try {
        const requestPayload: Record<string, unknown> = {
          model,
          instructions: systemPrompt,
          input: prompt,
          max_output_tokens: tokenCap,
          top_p: 1,
          tools: [FEATURE_CASH_TOOL],
          tool_choice: {
            type: "function",
            name: FEATURE_CASH_TOOL.name,
          },
          ...(serviceTier ? { service_tier: serviceTier } : {}),
          ...(temperature != null ? { temperature } : {}),
        };
        const response = await fetch(`${apiBaseUrl}/llm/rank-options`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${errText}`);
        }

        const data = await response.json();
        const payload = extractStructuredPayloadFromResponse(data);
        if (!payload || Object.keys(payload).length === 0) {
          throw new Error('empty JSON payload from model');
        }
        const parsed = parseFeatureCashPayload(payload);
        return {
          choice: parsed.choice,
          debugTrace: {
            request: requestPayload,
            response: data as Record<string, unknown>,
          },
        };
      } catch (error) {
        lastError = error;
        const message = String(error).toLowerCase();
        if (message.includes('temperature') && message.includes('unsupported')) {
          temperature = undefined;
        }
        if (serviceTier && message.includes('service_tier') && message.includes('invalid')) {
          serviceTier = undefined;
        }
        if (serviceTier === 'flex' && message.includes('flex') && message.includes('unavailable')) {
          serviceTier = 'default';
        }
        if ((message.includes('truncated') || message.includes('max_output_tokens')) && tokenCap < 4096) {
          tokenCap = Math.min(4096, Math.max(tokenCap * 2, tokenCap + 320));
        }

        if (attempt === Math.max(2, this.config.maxRetries ?? 3)) break;
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');
    throw new Error(`Failed to run feature-vs-cash calibration after retries: ${reason}`);
  }
}
