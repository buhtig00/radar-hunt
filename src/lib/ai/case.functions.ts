import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CaseAIAnalysis } from "@/lib/types";
import { callChatTool } from "./gateway.server";
import { retrieveContext, formatContextForPrompt, retrievedSourceIds } from "./rag.server";
import { persistInteraction, persistSafetyEvent } from "./persist.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectSafety, detectPII } from "@/lib/safety";
import { enforceDailyQuota } from "./quota.server";
import { screenEducationalOutput } from "./output-guard";

const inputSchema = z.object({
  title: z.string().max(300).default(""),
  subspecialty: z.string().min(1).max(100),
  age_range: z.string().max(100).default(""),
  complaint: z.string().max(2000).default(""),
  history: z.string().max(4000).default(""),
  examination: z.string().max(4000).default(""),
  imaging: z.string().max(4000).default(""),
  previous_treatments: z.string().max(2000).default(""),
  question: z.string().max(2000).default(""),
  language: z.enum(["es", "en"]).default("es"),
});

const TOOL = {
  name: "return_case_analysis",
  description: "Structured educational case analysis with PICO-style framing, red flags, sources.",
  parameters: {
    type: "object",
    properties: {
      case_summary: { type: "string" },
      relevant_data: { type: "array", items: { type: "string" } },
      missing_information: { type: "array", items: { type: "string" } },
      diagnostic_hypotheses: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, rationale: { type: "string" } },
          required: ["name", "rationale"],
          additionalProperties: false,
        },
      },
      complementary_tests: { type: "array", items: { type: "string" } },
      red_flags: { type: "array", items: { type: "string" } },
      discussion_questions: { type: "array", items: { type: "string" } },
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
      bibliography: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            year: { type: "number" },
            author: { type: "string" },
          },
          required: ["id", "title", "type"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "case_summary",
      "relevant_data",
      "diagnostic_hypotheses",
      "complementary_tests",
      "discussion_questions",
      "pico",
      "bibliography",
    ],
    additionalProperties: false,
  },
};

export interface CaseResult extends CaseAIAnalysis {
  interaction_id: string | null;
  pico?: { population: string; intervention: string; comparator: string; outcomes: string };
}

export const analyseCaseServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<CaseResult> => {
    const started = Date.now();
    await enforceDailyQuota(context.userId);
    const combined =
      `${data.title}\n${data.complaint}\n${data.history}\n${data.examination}\n${data.imaging}\n${data.previous_treatments}\n${data.question}`.trim();

    // Gate de PII en servidor (defensa en profundidad): el detector de cliente
    // solo advierte y puede saltarse. Aquí BLOQUEAMOS el envío al LLM si quedan
    // datos potencialmente identificables del paciente, antes de que el texto
    // salga hacia el proveedor de IA.
    const piiMatches = detectPII(combined);
    if (piiMatches.length > 0) {
      const types = Array.from(new Set(piiMatches.map((m) => m.type))).join(", ");
      throw new Error(
        `No se puede procesar el caso: se detectaron datos potencialmente identificables (${types}). ` +
          "Anonimiza el texto (usa iniciales, rango de edad y tiempos relativos) y vuelve a intentarlo.",
      );
    }

    const safety = detectSafety(combined, data.language);

    const chunks = await retrieveContext({
      query: combined.slice(0, 2000),
      subspecialty: data.subspecialty,
      language: data.language,
      topK: 6,
    });
    const ctx = formatContextForPrompt(chunks);
    const approvedSourceIds = retrievedSourceIds(chunks);

    const system =
      data.language === "es"
        ? `Eres "OR Análisis de Caso", IA educativa para oftalmólogos. REGLAS:
- Solo contenido educativo. No es diagnóstico definitivo.
- Cita SÓLO fuentes del CONTEXTO RAG aprobado (id exacto). Si insuficiente, dilo.
- Devuelve PICO estructurado y red_flags claras si hay riesgo.
- Responde llamando a "return_case_analysis" en Español.`
        : `You are "OR Case Analysis". RULES:
- Educational only.
- Cite ONLY approved RAG sources (exact id).
- Return PICO and red_flags.
- Respond via "return_case_analysis" in English.`;

    const user =
      `CONTEXTO RAG (fuentes aprobadas):\n${ctx}\n\n` +
      `Subespecialidad: ${data.subspecialty}\nRango edad: ${data.age_range}\n` +
      `Motivo: ${data.complaint}\nHistoria: ${data.history}\nExploración: ${data.examination}\n` +
      `Imagen/Pruebas: ${data.imaging}\nTratamientos previos: ${data.previous_treatments}\n` +
      `Pregunta: ${data.question}`;

    const parsed = (await callChatTool({
      system,
      user,
      tool: TOOL,
    })) as Partial<CaseResult>;

    // Validación de citas: solo conservamos las referencias presentes en el
    // corpus aprobado recuperado; descartamos cualquier cita inventada.
    const verifiedBibliography = (parsed.bibliography ?? []).filter((s) =>
      approvedSourceIds.has(s.id),
    );
    const hadUnverifiedCitations = (parsed.bibliography?.length ?? 0) > verifiedBibliography.length;

    const drift = screenEducationalOutput(
      [
        parsed.case_summary ?? "",
        ...(parsed.relevant_data ?? []),
        ...(parsed.complementary_tests ?? []),
        ...(parsed.diagnostic_hypotheses ?? []).map((h) => `${h.name} ${h.rationale}`),
      ].join("\n"),
    );

    const safetyFlags: string[] = [...safety.flags];
    if (safety.emergency && !safetyFlags.includes("Emergency symptom")) {
      safetyFlags.push("Emergency symptom");
    }
    if ((parsed.missing_information ?? []).length) safetyFlags.push("Missing data");
    if (chunks.length === 0 || hadUnverifiedCitations) safetyFlags.push("Evidence limited");
    if (drift.drifted) safetyFlags.push("Needs specialist review");
    const dedupedFlags = Array.from(new Set(safetyFlags));

    const answer: CaseAIAnalysis = {
      case_summary: parsed.case_summary ?? "",
      relevant_data: parsed.relevant_data ?? [],
      missing_information: parsed.missing_information ?? [],
      diagnostic_hypotheses: parsed.diagnostic_hypotheses ?? [],
      complementary_tests: parsed.complementary_tests ?? [],
      red_flags: parsed.red_flags ?? [],
      discussion_questions: parsed.discussion_questions ?? [],
      bibliography: verifiedBibliography,
      related_or_content: [],
      safety_flags: dedupedFlags as CaseAIAnalysis["safety_flags"],
    };

    const sourceIds = verifiedBibliography.map((s) => s.id).filter(Boolean);

    const interactionId = await persistInteraction({
      mode: "case_analysis",
      subspecialty: data.subspecialty,
      language: data.language,
      query: combined.slice(0, 4000),
      answer: { ...answer, pico: parsed.pico },
      safety_flags: dedupedFlags,
      sources_used: sourceIds,
      latency_ms: Date.now() - started,
      user_id: context.userId,
    });

    if (safety.emergency) {
      await persistSafetyEvent({
        interaction_id: interactionId,
        severity: "critical",
        categories: ["Emergency symptom"],
        matched_terms: safety.matchedTerms,
        query_excerpt: combined.slice(0, 240),
        action_taken: "Educational analysis + urgent referral",
        user_id: context.userId,
      });
    }

    return { ...answer, pico: parsed.pico, interaction_id: interactionId };
  });
