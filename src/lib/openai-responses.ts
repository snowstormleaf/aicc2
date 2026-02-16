import { getStoredModelConfig } from "@/lib/model-pricing";

const normalizeTemperature = (temperature: number, model: string): number | undefined => {
  if (model.startsWith("gpt-5")) {
    return undefined;
  }
  return temperature;
};

const mapServiceTier = (serviceTier: "standard" | "flex"): string =>
  serviceTier === "flex" ? "flex" : "default";

const extractOutputText = (response: Record<string, unknown>): string => {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  const output = response.output;
  if (!Array.isArray(output)) {
    return "";
  }
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const typedItem = item as Record<string, unknown>;
    if (typedItem.type !== "message" || !Array.isArray(typedItem.content)) continue;
    for (const contentPart of typedItem.content) {
      if (!contentPart || typeof contentPart !== "object") continue;
      const typedContent = contentPart as Record<string, unknown>;
      if (typedContent.type === "output_text" && typeof typedContent.text === "string") {
        return typedContent.text;
      }
      if (typedContent.type === "text" && typeof typedContent.text === "string") {
        return typedContent.text;
      }
    }
  }
  return "";
};

const extractJsonObject = (text: string): string => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
};

export const requestStructuredObject = async <T>({
  instructions,
  input,
  maxOutputTokens = 1200,
}: {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}): Promise<T> => {
  const { model, serviceTier } = getStoredModelConfig();
  const temperature = normalizeTemperature(0.2, model);

  const apiBaseUrl = import.meta.env?.VITE_API_URL || "http://localhost:3001/api";

  const response = await fetch(`${apiBaseUrl}/llm/structured`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      service_tier: mapServiceTier(serviceTier),
      ...(temperature != null ? { temperature } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const content = extractOutputText(data).trim();
  if (!content) {
    throw new Error("OpenAI returned empty content.");
  }
  const json = extractJsonObject(content);
  return JSON.parse(json) as T;
};
