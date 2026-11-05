// Server-only helpers for Lovable AI Gateway (chat + embeddings).
import { resolveChatModel } from "./platform-settings.server";

const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

// Embedding model is fixed: the ai_chunks vector column is vector(1536), so it
// must stay a 1536-dim model. Do NOT make this env-configurable.
const EMBED_MODEL = "openai/text-embedding-3-small";

function apiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY no está configurada.");
  return key;
}

function handleStatus(status: number, text: string): never {
  if (status === 429)
    throw new Error("Límite de peticiones alcanzado. Inténtalo en unos segundos.");
  if (status === 402)
    throw new Error(
      "Se han agotado los créditos de Lovable AI. Añade saldo en Settings → Workspace → Usage.",
    );
  throw new Error(`Lovable AI error ${status}: ${text.slice(0, 300)}`);
}

export interface ChatToolCall {
  name: string;
  arguments: string;
}

export async function callChatTool(opts: {
  model?: string;
  system: string;
  user: string;
  tool: { name: string; description: string; parameters: Record<string, unknown> };
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? (await resolveChatModel()),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [{ type: "function", function: opts.tool }],
      tool_choice: { type: "function", function: { name: opts.tool.name } },
    }),
  });
  if (!res.ok) handleStatus(res.status, await res.text().catch(() => ""));
  const json = await res.json();
  const argsStr = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error("La IA no devolvió una respuesta estructurada.");
  return JSON.parse(argsStr);
}

export async function embedText(input: string | string[]): Promise<number[][]> {
  const res = await fetch(`${GATEWAY_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input,
    }),
  });
  if (!res.ok) handleStatus(res.status, await res.text().catch(() => ""));
  const json = await res.json();
  return (json?.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}
