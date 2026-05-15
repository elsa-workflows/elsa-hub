import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^0.2.16";

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
 * Returns an array of 768-dimensional vectors (google/text-embedding-004).
 */
export async function embedTexts(
  apiKey: string,
  texts: string[],
  model = "google/text-embedding-004",
): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${body}`);
  }
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}
