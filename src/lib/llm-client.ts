import { Feature, Voucher, MaxDiffSet, RawResponse } from './maxdiff-engine';

export interface LLMConfig {
  apiKey: string;
  model?: string;
  reasoningModel?: string;
  serviceTier?: 'standard' | 'flex';
  maxRetries?: number;
  temperature?: number;
  useGPT?: boolean;
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
{\"min_discount\":10,\"max_discount\":200,\"levels\":6}`;
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
1. mostValued: The ID of your most preferred option
2. leastValued: The ID of your least preferred option  
3. ranking: All 4 option IDs ordered from most to least valuable
4. reasoning: Brief explanation of your decision (1-2 sentences)`;
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.reasoningModel,
          service_tier: this.config.serviceTier === 'flex' ? 'flex' : 'auto',
          messages: [
            { role: 'system', content: 'You are an automotive pricing expert.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

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

    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            service_tier: this.config.serviceTier === 'flex' ? 'flex' : 'auto',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            functions: [{
              name: 'rank_value',
              description: 'Rank the options from most to least valuable',
              parameters: {
                type: 'object',
                properties: {
                  mostValued: {
                    type: 'string',
                    description: 'ID of the most valuable option'
                  },
                  leastValued: {
                    type: 'string',
                    description: 'ID of the least valuable option'
                  },
                  ranking: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Complete ranking from most to least valuable (IDs)'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the ranking decision'
                  }
                },
                required: ['mostValued', 'leastValued', 'ranking']
              }
            }],
            function_call: { name: 'rank_value' },
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices?.[0]?.message?.function_call?.arguments) {
          const result = JSON.parse(data.choices[0].message.function_call.arguments);
          
          return {
            setId: set.id,
            personaId: persona.id,
            mostValued: result.mostValued,
            leastValued: result.leastValued,
            ranking: result.ranking || []
          };
        } else {
          throw new Error('Invalid response format from OpenAI');
        }

      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt === this.config.maxRetries) {
          // Fallback to random selection
          console.warn('All attempts failed, using random fallback');
          return this.generateRandomResponse(set, persona);
        }
        
        // Linear backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    // This should never be reached, but TypeScript requires it
    return this.generateRandomResponse(set, persona);
  }

  private generateRandomResponse(set: MaxDiffSet, persona: PersonaProfile): RawResponse {
    const shuffled = [...set.options].sort(() => Math.random() - 0.5);
    return {
      setId: set.id,
      personaId: persona.id,
      mostValued: shuffled[0].id,
      leastValued: shuffled[shuffled.length - 1].id,
      ranking: shuffled.map(o => o.id)
    };
  }
}
