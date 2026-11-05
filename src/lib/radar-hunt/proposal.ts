// RADAR HUNT — solicitud de propuesta (industria, congresos, sociedades). Validación común
// para la demo y el servidor.
import { z } from "zod";

export const proposalSchema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre.").max(80),
  organization: z.string().trim().min(2, "Indica la organización.").max(120),
  role: z.string().trim().max(80).default(""),
  kind: z.enum(["sociedad", "congreso", "industria", "otro"]),
  email: z.string().trim().email("Revisa el correo electrónico.").max(120),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres).").max(1500),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Necesitamos tu consentimiento para responderte." }),
  }),
  website: z.string().max(0).optional(),
});

export type ProposalRequest = z.infer<typeof proposalSchema>;
