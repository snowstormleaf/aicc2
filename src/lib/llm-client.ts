import { Feature, Voucher, MaxDiffSet, RawResponse } from './maxdiff-engine';

export interface LLMConfig {
  apiKey: string;
  model?: string;
  reasoningModel?: string;
  serviceTier?: 'standard' | 'flex';
  maxRetries?: number;
  temperature?: number;
  useGPT?: boolean;
  maxOutputTokens?: number;
}

export interface VoucherBounds {
  min_discount: number;
  max_discount: number;
  levels: number;
}

export interface PersonaProfile {
  id: string;
  name: string;
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

INSTRUCTIONS:
- Think and respond ONLY as this persona
- Consider your specific needs, budget constraints, and priorities
- Make decisions based on your demographic profile and motivations
- Do NOT reveal your thought process or mention that you are an AI
- Be consistent with your persona's characteristics throughout
- Focus on practical value from your persona's perspective

CRITICAL: You must use the rank_value function to provide your response. Do not provide explanations outside the function call.`;
};

export const buildUserPrompt = (
  set: MaxDiffSet,
  vehicle: { brand: string; name: string },
  featureDescriptions: Map<string, string>
): string => {
  const optionsText = set.options.map((option, index) => {
    const description = featureDescriptions.get(option.id) || option.description || 'No description available';
    return `${index + 1}. ${option.name} (ID: ${option.id})
   ${description}`;
  }).join('\n\n');

  return `You are considering purchasing a ${vehicle.brand} ${vehicle.name} and need to evaluate these 4 options:

${optionsText}

As a ${featureDescriptions.get('persona_name') || 'buyer'}, please rank these options from MOST valuable to LEAST valuable to you personally.

Consider:
- Which option would be most important for your specific needs?
- Which option would you be least willing to pay extra for?
- How do these options align with your priorities and budget?

Use the rank_value function to provide:
1. most_valued: The ID of your most preferred option
2. least_valued: The ID of your least preferred option
3. ranking: All 4 option IDs ordered from most to least valuable`;
};

const RANK_VALUE_TOOL = {
  type: 'function',
  name: 'rank_value',
  description: 'Rank the options from most to least valuable',
  parameters: {
    type: 'object',
    properties: {
      most_valued: {
        type: 'string',
        description: 'ID of the most valuable option'
      },
      least_valued: {
        type: 'string',
        description: 'ID of the least valuable option'
      },
      ranking: {
        type: 'array',
        items: { type: 'string' },
        description: 'Complete ranking from most to least valuable (IDs)'
      }
    },
    required: ['most_valued', 'least_valued', 'ranking'],
    additionalProperties: false
  },
  strict: true
} as const;

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

const parseRankArgs = (rawArgs: unknown): Record<string, unknown> => {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'string') {
    const parsed = extractJsonPayload(rawArgs);
    if (parsed && typeof parsed === 'object') {
      return parsed.arguments && typeof parsed.arguments === 'object'
        ? (parsed.arguments as Record<string, unknown>)
        : parsed;
    }
    return {};
  }
  if (typeof rawArgs === 'object') {
    const parsed = rawArgs as Record<string, unknown>;
    return parsed.arguments && typeof parsed.arguments === 'object'
      ? (parsed.arguments as Record<string, unknown>)
      : parsed;
  }
  return {};
};

const extractToolArgumentsFromResponse = (response: Record<string, unknown>): Record<string, unknown> => {
  const output = response.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const typedItem = item as Record<string, unknown>;
      const type = typedItem.type;
      if ((type === 'tool_call' || type === 'function_call') && typedItem.name === 'rank_value') {
        return parseRankArgs(typedItem.arguments);
      }
      if (typedItem.tool_call && typeof typedItem.tool_call === 'object') {
        const toolCall = typedItem.tool_call as Record<string, unknown>;
        if (toolCall.name === 'rank_value') {
          return parseRankArgs(toolCall.arguments);
        }
      }
    }
  }
  if (typeof response.output_text === 'string') {
    return parseRankArgs(response.output_text);
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

const normalizeTemperature = (temperature: number | undefined, model: string): number | undefined => {
  if (temperature == null) return undefined;
  if (model.startsWith('gpt-5') && temperature !== 1 && temperature !== 1.0) {
    return undefined;
  }
  return temperature;
};

const mapServiceTier = (serviceTier?: 'standard' | 'flex'): string | undefined => {
  if (serviceTier === 'flex') return 'flex';
  if (serviceTier === 'standard') return 'default';
  return undefined;
};

const parseRankValuePayload = (payload: Record<string, unknown>) => {
  const most = payload.most_valued ?? payload.mostValued ?? payload.most;
  const least = payload.least_valued ?? payload.leastValued ?? payload.least;
  const ranking = payload.ranking;

  if (typeof most !== 'string' || typeof least !== 'string') {
    throw new Error(`Missing keys in model output: ${JSON.stringify(payload)}`);
  }
  if (!Array.isArray(ranking) || !ranking.every(item => typeof item === 'string')) {
    throw new Error(`Ranking must be a list of strings: ${JSON.stringify(payload)}`);
  }
  return { mostValued: most, leastValued: least, ranking };
};

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      model: 'gpt-4.1-mini-2025-04-14',
      reasoningModel: 'o4-mini-2025-04-16',
      serviceTier: 'standard',
      maxRetries: 3,
      temperature: 0.2,
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
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.reasoningModel,
          instructions: 'You are an automotive pricing expert.',
          input: prompt,
          max_output_tokens: 400,
          service_tier: mapServiceTier(this.config.serviceTier),
          temperature: normalizeTemperature(this.config.temperature, this.config.reasoningModel ?? '')
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
    vehicle: { brand: string; name: string },
    featureDescriptions: Map<string, string>
  ): Promise<RawResponse> {
    const systemPrompt = buildSystemPrompt(persona);
    const userPrompt = buildUserPrompt(set, vehicle, featureDescriptions);
    const model = this.config.model ?? 'gpt-4.1-mini-2025-04-14';
    let tokenCap = this.config.maxOutputTokens ?? 1024;
    let temperature = normalizeTemperature(this.config.temperature, model);
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

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            instructions: systemPrompt,
            input: userPrompt,
            tools: [RANK_VALUE_TOOL],
            tool_choice: { type: 'function', name: 'rank_value' },
            max_output_tokens: tokenCap,
            ...(serviceTier ? { service_tier: serviceTier } : {}),
            ...(temperature != null ? { temperature } : {})
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${errText}`);
        }

        const data = await response.json();
        const args = extractToolArgumentsFromResponse(data);
        if (!args || Object.keys(args).length === 0) {
          const reason = (data.incomplete_details as { reason?: string } | undefined)?.reason;
          if (reason === 'max_output_tokens') {
            throw new Error('max_output_tokens exhausted');
          }
          throw new Error('empty response from model');
        }

        const parsed = parseRankValuePayload(args);
        return {
          setId: set.id,
          personaId: persona.id,
          mostValued: parsed.mostValued,
          leastValued: parsed.leastValued,
          ranking: parsed.ranking || []
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
        
        if (attempt === this.config.maxRetries) break;
        
        // Linear backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');
    throw new Error(`Failed to rank options after ${this.config.maxRetries} attempts: ${reason}`);
  }
}
