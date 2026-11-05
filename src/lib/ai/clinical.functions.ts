import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AIAnswer } from "@/lib/types";
import { callChatTool } from "./gateway.server";
import { retrieveContext, formatContextForPrompt, retrievedSourceIds } from "./rag.server";
import { persistInteraction, persistSafetyEvent } from "./persist.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectSafety } from "@/lib/safety";
import { enforceDailyQuota } from "./quota.server";
import { screenEducationalOutput } from "./output-guard";

const inputSchema = z.object({
  query: z.string().min(1).max(4000),
  subspecialty: z.string().min(1).max(100),
  language: z.enum(["es", "en"]),
  mode: z.string().min(1).max(100),
});

const TOOL = {
  name: "return_clinical_answer",
  description:
    "Structured educational ophthalmology answer with PICO, red flags and approved sources.",
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string" },
      considerations: { type: "array", items: { type: "string" } },
      missing_information: { type: "array", items: { type: "string" } },
      differential: { type: "array", items: { type: "string" } },
      evidence_overview: { type: "string" },
      red_flags: { type: "array", items: { type: "string" } },
      pico: {
        type: "object",
        properties: {
          population: { type: "string" },
          intervention: { type: "string" },
          comparator: { type: "string" },
          outcomes: { type: "string" },
        },
        required: ["population", "intervention", "comparator", "outcomes"],
        additionalProperties: false,
      },
      sources_used: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            author: { type: "string" },
            type: { type: "string" },
            year: { type: "number" },
          },
          required: ["id", "title", "type"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "considerations", "evidence_overview", "pico", "sources_used"],
    additionalProperties: false,
  },
};

export interface ClinicalResult extends AIAnswer {
  interaction_id: string | null;
  pico?: { population: string; intervention: string; comparator: string; outcomes: string };
}

export const askClinicalAIServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ClinicalResult> => {
    const started = Date.now();
    await enforceDailyQuota(context.userId);
    const safety = detectSafety(data.query, data.language);

    const chunks = await retrieveContext({
      query: data.query,
      subspecialty: data.subspecialty,
      language: data.language,
      topK: 6,
    });
    const ctx = formatContextForPrompt(chunks);
    const approvedSourceIds = retrievedSourceIds(chunks);

    const system =
      data.language === "es"
        ? `Eres "OR IA Clínica", asistente IA para oftalmólogos verificados. REGLAS ESTRICTAS:
- Solo contenido EDUCATIVO/BIBLIOGRÁFICO.
- NUNCA diagnósticos, interpretación de imágenes ni tratamiento individualizado.
- Cita ÚNICAMENTE fuentes del CONTEXTO RAG aprobado (usa el id exacto de cada fuente). Si el contexto no es suficiente, dilo explícitamente y NO inventes referencias.
- Devuelve PICO estructurado (Población, Intervención, Comparador, Outcomes).
- Si detectas urgencia, incluye red_flags claras pidiendo evaluación presencial inmediata.
- Responde llamando a "return_clinical_answer" en Español.`
        : `You are "OR Clinical AI" for verified ophthalmologists. STRICT RULES:
- Educational/bibliographic content only.
- Cite ONLY sources from the approved RAG CONTEXT (use exact source id). If insufficient, say so. Do NOT invent references.
- Return structured PICO.
- Flag emergencies in red_flags.
- Respond by calling "return_clinical_answer" in English.`;

    const user =
      `CONTEXTO RAG (fuentes aprobadas):\n${ctx}\n\n` +
      `Subespecialidad: ${data.subspecialty}\nModo: ${data.mode}\n\nPregunta:\n${data.query}`;

    const parsed = (await callChatTool({
      system,
      user,
      tool: TOOL,
    })) as Partial<ClinicalResult>;

    // Validación de citas: descartamos cualquier fuente que el modelo devuelva
    // pero que NO esté entre los chunks aprobados recuperados. Esto neutraliza
    // las referencias inventadas (alucinaciones), que en un contexto clínico
    // son especialmente peligrosas.
    const verifiedSources = (parsed.sources_used ?? []).filter((s) => approvedSourceIds.has(s.id));
    const hadUnverifiedCitations = (parsed.sources_used?.length ?? 0) > verifiedSources.length;

    // Guardarraíl de salida: si la respuesta derivó a consejo individualizado
    // (posología, prescripción, diagnóstico definitivo), la marcamos para
    // revisión por especialista en lugar de reescribirla.
    const drift = screenEducationalOutput(
      [
        parsed.summary ?? "",
        ...(parsed.considerations ?? []),
        parsed.evidence_overview ?? "",
        ...(parsed.differential ?? []),
      ].join("\n"),
    );

    const safetyFlags = Array.from(
      new Set<string>([
        ...(parsed.safety_flags ?? []),
        ...safety.flags,
        // Si no hubo contexto recuperado, o el modelo citó fuera del corpus,
        // marcamos la evidencia como limitada para la capa editorial/KOL.
        ...(chunks.length === 0 || hadUnverifiedCitations ? ["Evidence limited"] : []),
        ...(drift.drifted ? ["Needs specialist review"] : []),
      ]),
    );
    const sourceIds = verifiedSources.map((s) => s.id);

    const answer: AIAnswer = {
      summary: parsed.summary ?? "",
      considerations: parsed.considerations ?? [],
      missing_information: parsed.missing_information,
      differential: parsed.differential,
      evidence_overview: parsed.evidence_overview ?? "",
      red_flags: parsed.red_flags,
      sources_used: verifiedSources,
      related_or_content: [],
      validation_level: "AI Generated",
      safety_flags: safetyFlags as AIAnswer["safety_flags"],
    };

    const interactionId = await persistInteraction({
      mode: "clinical_ai",
      subspecialty: data.subspecialty,
      language: data.language,
      query: data.query,
      answer: { ...answer, pico: parsed.pico },
      safety_flags: safetyFlags,
      sources_used: sourceIds,
      latency_ms: Date.now() - started,
      user_id: context.userId,
    });

    if (safety.emergency || safetyFlags.length) {
      await persistSafetyEvent({
        interaction_id: interactionId,
        severity: safety.emergency ? "critical" : "info",
        categories: safetyFlags,
        matched_terms: safety.matchedTerms,
        query_excerpt: data.query.slice(0, 240),
        action_taken: safety.emergency
          ? "Educational answer + urgent in-person referral"
          : "Logged",
        user_id: context.userId,
      });
    }

    return { ...answer, pico: parsed.pico, interaction_id: interactionId };
  });
