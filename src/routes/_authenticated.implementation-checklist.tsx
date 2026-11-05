import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RoleGuard } from "@/components/role-guard";
import { SUPABASE_MODE } from "@/lib/db/client";
import { CheckCircle2, CircleDashed, AlertTriangle, FlaskConical, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/implementation-checklist")({
  head: () => ({
    meta: [
      { title: "Checklist de implementación · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Vista de handoff para desarrolladores: qué está listo, qué es solo simulado y qué necesita backend, validación legal o clínica.",
      },
    ],
  }),
  component: () => (
    <RoleGuard capability="view_implementation_checklist">
      <ImplementationChecklist />
    </RoleGuard>
  ),
});

type Status = "ready" | "mock" | "needs_backend" | "needs_legal" | "needs_clinical";

const LABELS: Record<Status, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  ready: {
    label: "Listo",
    tone: "text-[color:var(--success)] border-success/30 bg-success/10",
    icon: CheckCircle2,
  },
  mock: {
    label: "Solo simulado",
    tone: "text-muted-foreground border-border bg-muted",
    icon: CircleDashed,
  },
  needs_backend: {
    label: "Requiere backend",
    tone: "text-[color:var(--warning)] border-warning/30 bg-warning/10",
    icon: AlertTriangle,
  },
  needs_legal: {
    label: "Requiere validación legal",
    tone: "text-[color:var(--ring)] border-[color:var(--ring)]/30 bg-[color:var(--ring)]/10",
    icon: Scale,
  },
  needs_clinical: {
    label: "Requiere validación clínica",
    tone: "text-[color:var(--gold)] border-gold/30 bg-gold/10",
    icon: FlaskConical,
  },
};

interface Row {
  title: string;
  status: Status;
  detail: string;
}

interface Section {
  title: string;
  rows: Row[];
}

const live = SUPABASE_MODE === "live";

const SECTIONS: Section[] = [
  {
    title: "UI del frontend",
    rows: [
      {
        title: "Las 9 páginas accesibles desde el sidebar",
        status: "ready",
        detail: "Rutas planas dot-file en src/routes.",
      },
      {
        title: "Gating por rol en la UI",
        status: "ready",
        detail: "src/lib/permissions.ts + <RoleGuard />.",
      },
      {
        title: "Toasts y diálogos de confirmación",
        status: "ready",
        detail: "Las acciones destructivas usan AlertDialog.",
      },
      {
        title: "Layout responsive (1280 → móvil)",
        status: "ready",
        detail: "Probado a 1322 y por debajo.",
      },
    ],
  },
  {
    title: "Conexión con Supabase",
    rows: [
      {
        title: "Cliente Supabase en navegador con anon key",
        status: live ? "ready" : "needs_backend",
        detail: live
          ? "VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY detectadas."
          : "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para salir del modo demo.",
      },
      {
        title: "Separación de capas de servicio",
        status: "ready",
        detail: "src/lib/services/* + src/lib/db/*.",
      },
      {
        title: "Fallback simulado en cada servicio",
        status: "ready",
        detail: "Comprobación isSupabaseConfigured en cada módulo.",
      },
    ],
  },
  {
    title: "Edge Functions",
    rows: [
      {
        title: "Invocación de or-clinical-ai cableada",
        status: live ? "needs_backend" : "mock",
        detail:
          "El frontend llama a supabase.functions.invoke('or-clinical-ai'). La función debe desplegarse.",
      },
      {
        title: "Invocación de ingest-ai-source cableada",
        status: live ? "needs_backend" : "mock",
        detail: "Usada al subir conocimiento cuando se adjunta texto crudo.",
      },
    ],
  },
  {
    title: "Pipeline RAG",
    rows: [
      {
        title: "Extensión pgvector",
        status: "needs_backend",
        detail: "Habilita pgvector en el proyecto Supabase.",
      },
      {
        title: "Columna de embeddings ai_chunks",
        status: "needs_backend",
        detail: "vector(1536) para text-embedding-3-small.",
      },
      {
        title: "Prompt de recuperación + reranking",
        status: "needs_backend",
        detail: "Implementar dentro de la edge function or-clinical-ai.",
      },
    ],
  },
  {
    title: "Ingesta de conocimiento",
    rows: [
      {
        title: "Modal de subida de fuente",
        status: "ready",
        detail: "Valida campos requeridos y envía a la capa de servicio.",
      },
      {
        title: "Parseo de PDF / DOCX",
        status: "needs_backend",
        detail: "Ejecutar dentro de la edge function ingest-ai-source.",
      },
      {
        title: "Job de chunking + embeddings",
        status: "needs_backend",
        detail: "Disparado tras pasar al estado Aprobado.",
      },
    ],
  },
  {
    title: "Filtros de seguridad",
    rows: [
      {
        title: "Detección de términos de urgencia (ES/EN)",
        status: "ready",
        detail: "src/lib/safety.ts detectSafety().",
      },
      {
        title: "Pre-comprobación local de PII en análisis de casos",
        status: "ready",
        detail: "detectPII() bloquea el envío hasta resolver.",
      },
      {
        title: "Registro server-side en ai_safety_events",
        status: "needs_backend",
        detail: "Insertar desde la edge function en cada match de seguridad.",
      },
      {
        title: "Revisión clínica final de la taxonomía de seguridad",
        status: "needs_clinical",
        detail: "Confirmar categorías y mensajes con el comité médico.",
      },
    ],
  },
  {
    title: "Flujo editorial",
    rows: [
      {
        title: "Aprobar / rechazar / archivar / enviar a KOL",
        status: "ready",
        detail: "Cableado con diálogos de confirmación y toasts.",
      },
      {
        title: "Persistir decisiones editoriales",
        status: live ? "needs_backend" : "mock",
        detail: "Actualmente muta estado local; stubs de servicio listos.",
      },
    ],
  },
  {
    title: "Verificación KOL",
    rows: [
      {
        title: "Hoja de decisión + comentario firmado",
        status: "ready",
        detail: "Drawer con radio de decisión y comentario.",
      },
      {
        title: "Escritura de fila en ai_validated_answers",
        status: live ? "needs_backend" : "mock",
        detail: "Promover respuesta a Verificado por KOL al aprobar.",
      },
      {
        title: "Validación clínica del flujo KOL",
        status: "needs_clinical",
        detail: "Confirmar opciones de decisión, cadencia de revisión y modelo de firma.",
      },
    ],
  },
  {
    title: "Analítica",
    rows: [
      {
        title: "Dashboards agregados",
        status: "ready",
        detail: "Recharts sobre datos simulados agregados.",
      },
      {
        title: "Gating para industria (sin consultas individuales)",
        status: "ready",
        detail: "Aplicado vía permisos.",
      },
      {
        title: "Vistas materializadas para agregación en vivo",
        status: "needs_backend",
        detail: "Construir rollups por subespecialidad en Postgres.",
      },
    ],
  },
  {
    title: "Revisión GDPR / privacidad",
    rows: [
      {
        title: "Disclaimer educativo en cada respuesta de IA",
        status: "ready",
        detail: "DisclaimerBox aplicado por la UI.",
      },
      {
        title: "Política de retención de datos",
        status: "needs_legal",
        detail: "Confirmar valores por defecto 180 / 365 / 730 días con el DPO.",
      },
      {
        title: "Garantías de anonimización",
        status: "needs_legal",
        detail: "Documentar manejo de PII en el análisis de casos.",
      },
    ],
  },
  {
    title: "Monitorización de coste",
    rows: [
      {
        title: "Topes por plan visibles en Configuración",
        status: "ready",
        detail: "Valores editables en /settings → Límites de uso.",
      },
      {
        title: "Facturación por organización + medición de tokens",
        status: "needs_backend",
        detail: "Agregar tokens desde ai_interactions.",
      },
    ],
  },
  {
    title: "Beta testing",
    rows: [
      {
        title: "Modo demo para CEO / pharma / inversores",
        status: "ready",
        detail: "No requiere backend.",
      },
      {
        title: "Beta cerrada con 10–20 oftalmólogos",
        status: "needs_backend",
        detail: "Requiere auth, RLS y edge functions en vivo.",
      },
    ],
  },
];

function ImplementationChecklist() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Handoff a desarrollo"
        title="Checklist de implementación"
        description="Qué está listo en el MVP, qué está simulado localmente y qué requiere todavía trabajo de backend, legal o clínico antes de producción."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-base font-semibold text-foreground">{s.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {s.rows.map((r) => {
                const meta = LABELS[r.status];
                const Icon = meta.icon;
                return (
                  <li
                    key={r.title}
                    className="flex items-start gap-3 rounded-md border border-border bg-surface-muted/50 p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
                        meta.tone,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-[13.5px] font-medium text-foreground">{r.title}</p>
                      <p className="text-[12px] text-muted-foreground">{r.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
