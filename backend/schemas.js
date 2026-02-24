import { z } from 'zod';

/**
 * Validation schemas for Personas and Vehicles
 * Used for request body validation and runtime type checking
 */

// ===== PERSONA SCHEMAS =====

export const PersonaDemographicsSchema = z.object({
  age: z.string().optional(),
  income: z.string().optional(),
  family: z.string().optional(),
  location: z.string().optional(),
}).optional();

export const PersonaAttributesSchema = z.object({
  role: z.string().optional(),
  company_size: z.string().optional(),
  responsibility: z.string().optional(),
  decision_authority: z.string().optional(),
}).optional();

export const PersonaMetaSchema = z.object({
  source: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).optional();

export const PersonaSchema = z.object({
  id: z.string().min(1, 'Persona ID is required'),
  name: z.string().min(1, 'Persona name is required').max(255, 'Name too long'),
  summary: z.string().max(1000, 'Summary too long').optional().nullable(),
  attributes: PersonaAttributesSchema,
  demographics: PersonaDemographicsSchema,
  motivations: z.array(z.string()).optional().default([]),
  painPoints: z.array(z.string()).optional().default([]),
  buyingBehavior: z.array(z.string()).optional().default([]),
  traits: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  goals: z.array(z.string()).optional().default([]),
  jobsToBeDone: z.array(z.string()).optional().default([]),
  decisionCriteria: z.array(z.string()).optional().default([]),
  objections: z.array(z.string()).optional().default([]),
  channels: z.array(z.string()).optional().default([]),
  preferredContent: z.array(z.string()).optional().default([]),
  meta: PersonaMetaSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PersonaBatchSchema = z.object({
  personas: z.array(PersonaSchema),
});

// ===== VEHICLE SCHEMAS =====

export const VehicleSchema = z.object({
  id: z.string().min(1, 'Vehicle ID is required'),
  name: z.string().min(1, 'Vehicle name is required').max(255, 'Name too long'),
  manufacturer: z.string().max(255, 'Manufacturer too long').optional().nullable(),
  model: z.string().max(255, 'Model too long').optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const VehicleBatchSchema = z.object({
  vehicles: z.array(VehicleSchema),
});



// ===== LLM SCHEMAS =====

export const LlmResponseRequestSchema = z.object({
  model: z.string().min(1),
  instructions: z.string().optional(),
  input: z.string().min(1),
  max_output_tokens: z.number().int().positive().optional(),
  service_tier: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
});

export const LlmVoucherBoundsSchema = z.object({
  model: z.string().min(1).optional(),
  prompt: z.string().min(1),
  max_output_tokens: z.number().int().positive().optional(),
  service_tier: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
});

// ===== VALIDATION UTILITIES =====

/**
 * Safely validate a request body against a schema
 * @returns {success: true, data} or {success: false, error}
 */
export function validateRequest(data, schema) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('; ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}
