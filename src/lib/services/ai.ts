import { askClinicalAIServer } from "@/lib/ai/clinical.functions";
import { askAcademyTutorServer } from "@/lib/ai/tutor.functions";
import { analyseCaseServer } from "@/lib/ai/case.functions";
import type {
  AIAnswer,
  CaseAIAnalysis,
  ClinicalAIMode,
  ClinicalCaseInput,
  Language,
  Subspecialty,
  TutorAnswer,
  TutorMode,
} from "../types";

export interface ClinicalAIRequest {
  query: string;
  subspecialty: Subspecialty;
  language: Language;
  mode: ClinicalAIMode;
}

export type AIAnswerWithId = AIAnswer & {
  interaction_id: string | null;
  pico?: { population: string; intervention: string; comparator: string; outcomes: string };
};

export async function askClinicalAI(req: ClinicalAIRequest): Promise<AIAnswerWithId> {
  return askClinicalAIServer({ data: req });
}

export type TutorAnswerWithId = TutorAnswer & { interaction_id: string | null };

export async function askAcademyTutor(params: {
  courseTitle: string;
  moduleTitle: string;
  mode: TutorMode;
  question?: string;
  language?: Language;
  subspecialty?: Subspecialty;
}): Promise<TutorAnswerWithId> {
  return askAcademyTutorServer({
    data: {
      courseTitle: params.courseTitle,
      moduleTitle: params.moduleTitle,
      mode: params.mode,
      question: params.question ?? "",
      language: params.language ?? "es",
      subspecialty: params.subspecialty,
    },
  });
}

export type CaseAnalysisWithId = CaseAIAnalysis & {
  interaction_id: string | null;
  pico?: { population: string; intervention: string; comparator: string; outcomes: string };
};

export async function analyseCase(input: ClinicalCaseInput): Promise<CaseAnalysisWithId> {
  return analyseCaseServer({
    data: {
      title: input.title,
      subspecialty: input.subspecialty,
      age_range: input.age_range,
      complaint: input.complaint,
      history: input.history,
      examination: input.examination,
      imaging: input.imaging,
      previous_treatments: input.previous_treatments,
      question: input.question,
      language: "es",
    },
  });
}
