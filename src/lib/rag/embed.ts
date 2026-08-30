import { EMBED_DIMS, EMBED_MODEL } from "./config";

export async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`;

  let attempt = 0;
  while (attempt < 4) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBED_DIMS,
      }),
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      attempt++;
      continue;
    }

    if (!res.ok) {
      throw new Error(`Embed query failed: ${res.status}`);
    }

    const data = await res.json();
    return data.embedding?.values || data.embedding || [];
  }

  throw new Error("Embed query rate limited");
}
