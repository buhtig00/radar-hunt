import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TutorAnswer } from "@/lib/types";
import { callChatTool } from "./gateway.server";
import { retrieveContext, formatContextForPrompt } from "./rag.server";
import { persistInteraction } from "./persist.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceDailyQuota } from "./quota.server";

const inputSchema = z.object({
  courseTitle: z.string().min(1).max(300),
  moduleTitle: z.string().min(1).max(300),
  mode: z.string().min(1).max(100),
  question: z.string().max(2000).optional().default(""),
  language: z.enum(["es", "en"]).default("es"),
  subspecialty: z.string().max(100).optional(),
});

const MCQ = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", enum: ["A", "B", "C", "D"] },
          text: { type: "string" },
        },
        required: ["label", "text"],
        additionalProperties: false,
      },
      minItems: 4,
      maxItems: 4,
    },
    correct: { type: "string", enum: ["A", "B", "C", "D"] },
    explanation: { type: "string" },
  },
  required: ["question", "options", "correct", "explanation"],
  additionalProperties: false,
};

const TOOL = {
  name: "return_tutor_answer",
  description: "Structured tutor answer with explanation, MCQs, flashcards and key concepts.",
  parameters: {
    type: "object",
    properties: {
      short_answer: { type: "string" },
      expanded_explanation: { type: "string" },
      clinical_pearl: { type: "string" },
      self_assessment: MCQ,
      key_concepts: { type: "array", items: { type: "string" } },
      flashcards: {
        type: "array",
        items: {
          type: "object",
          properties: { front: { type: "string" }, back: { type: "string" } },
          required: ["front", "back"],
          additionalProperties: false,
        },
      },
      mcqs: { type: "array", items: MCQ },
      exam_readiness: { type: "number" },
      recommended_content: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
          required: ["id", "title"],
          additionalProperties: false,
        },
      },
      sources_used: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            year: { type: "number" },
          },
          required: ["id", "title", "type"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "short_answer",
      "expanded_explanation",
      "clinical_pearl",
      "self_assessment",
      "key_concepts",
      "flashcards",
      "mcqs",
      "exam_readiness",
    ],
    additionalProperties: false,
  },
};

export interface TutorResult extends TutorAnswer {
  interaction_id: string | null;
  sources_used?: { id: string; title: string; type: string; year?: number }[];
}

export const askAcademyTutorServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<TutorResult> => {
    const started = Date.now();
    await enforceDailyQuota(context.userId);
    const baseQuery = data.question?.trim()
      ? data.question
      : `${data.mode}: ${data.courseTitle} — ${data.moduleTitle}`;

    const chunks = await retrieveContext({
      query: baseQuery,
      subspecialty: data.subspecialty,
      language: data.language,
      topK: 6,
    });
    const ctx = formatContextForPrompt(chunks);

    const system =
      data.language === "es"
        ? `Eres "OR Tutor Académico", IA educativa para oftalmólogos. REGLAS:
- Contenido EDUCATIVO. Nada de diagnóstico individualizado.
- Cita SÓLO fuentes del CONTEXTO RAG aprobado (id exacto). Si no es suficiente, dilo y no inventes.
- Devuelve MCQs y flashcards de alta calidad pedagógica.
- Responde llamando a "return_tutor_answer" en Español.`
        : `You are "OR Academy Tutor". RULES:
- Educational content. No individualized diagnosis.
- Cite ONLY sources from the approved RAG CONTEXT (exact id). If insufficient, say so.
- High-quality MCQs and flashcards.
- Respond by calling "return_tutor_answer" in English.`;

    const user =
      `CONTEXTO RAG (fuentes aprobadas):\n${ctx}\n\n` +
      `Curso: ${data.courseTitle}\nMódulo: ${data.moduleTitle}\nModo: ${data.mode}\n\n` +
      (data.question ? `Pregunta del usuario: ${data.question}` : "Resume y enseña el módulo.");

    const parsed = (await callChatTool({
      system,
      user,
      tool: TOOL,
    })) as Partial<TutorResult>;

    const answer: TutorAnswer = {
      short_answer: parsed.short_answer ?? "",
      expanded_explanation: parsed.expanded_explanation ?? "",
      clinical_pearl: parsed.clinical_pearl ?? "",
      self_assessment: parsed.self_assessment as TutorAnswer["self_assessment"],
      recommended_content: parsed.recommended_content ?? [],
      key_concepts: parsed.key_concepts ?? [],
      flashcards: parsed.flashcards ?? [],
      mcqs: parsed.mcqs ?? [],
      exam_readiness: parsed.exam_readiness ?? 0,
    };

    const sourceIds = (parsed.sources_used ?? []).map((s) => s.id).filter(Boolean);

    const interactionId = await persistInteraction({
      mode: "academy_tutor",
      subspecialty: data.subspecialty ?? null,
      language: data.language,
      query: baseQuery,
      answer: { ...answer, sources_used: parsed.sources_used },
      sources_used: sourceIds,
      latency_ms: Date.now() - started,
      user_id: context.userId,
    });

    return { ...answer, sources_used: parsed.sources_used, interaction_id: interactionId };
  });
