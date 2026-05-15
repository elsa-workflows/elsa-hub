import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^1.0.0";

export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

/**
 * Embed an array of strings using Lovable AI Gateway.
 * Returns 768-dimensional vectors to match the copilot_documents.embedding column.
 * Uses google/gemini-embedding-001 with explicit dimensions=768.
 */
export async function embedTexts(
  apiKey: string,
  texts: string[],
  model = "google/gemini-embedding-001",
  dimensions = 768,
): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({ model, input: texts, dimensions }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${body}`);
  }
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}
