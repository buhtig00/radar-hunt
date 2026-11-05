import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { EducationalUseBanner } from "@/components/disclaimers";
import { ModeChip } from "@/components/badges";
import {
  Stethoscope,
  GraduationCap,
  ClipboardList,
  ShieldCheck,
  Users,
  Library,
  MessagesSquare,
  ListChecks,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  Upload,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel principal · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Resumen operativo de la Capa de Inteligencia de Ophthalmology Radar: oftalmólogos verificados, fuentes aprobadas, interacciones de IA y revisiones editoriales.",
      },
      { property: "og:title", content: "Panel principal · Ophthalmology Radar" },
      {
        property: "og:description",
        content:
          "Capa controlada de inteligencia clínica para educación, evidencia y conocimiento validado por KOL en oftalmología.",
      },
    ],
  }),
  component: Dashboard,
});

const WORKSPACES = [
  {
    title: "OR IA Clínica",
    description:
      "Respuestas educativas y bibliográficas basadas en fuentes oftalmológicas aprobadas.",
    href: "/clinical-ai",
    icon: Stethoscope,
    chip: "IA Educativa",
    chipTone: "blue" as const,
  },
  {
    title: "Tutor IA Academy",
    description:
      "Tutor específico de cada curso para aprendizaje estructurado, MCQ y preparación de exámenes.",
    href: "/academy-tutor",
    icon: GraduationCap,
    chip: "Educación",
    chipTone: "blue" as const,
  },
  {
    title: "Análisis de casos clínicos",
    description:
      "Soporte de razonamiento educativo sobre casos clínicos anonimizados — nunca definitivo.",
    href: "/case-analysis",
    icon: ClipboardList,
    chip: "Razonamiento",
    chipTone: "blue" as const,
  },
  {
    title: "Capa KOL Verificada",
    description:
      "Respuestas validadas por líderes de opinión con nombre, subespecialidad y fecha de revisión.",
    href: "/kol-verification",
    icon: ShieldCheck,
    chip: "Verificado por KOL",
    chipTone: "gold" as const,
  },
];

function Dashboard() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <PageHeader
        eyebrow="Capa de Inteligencia · MVP v0.9"
        title="Una capa controlada de inteligencia clínica para oftalmología"
        description="Respuestas educativas, búsqueda de evidencia, razonamiento de casos y conocimiento validado por KOL — sobre fuentes aprobadas, con guardarraíles de seguridad y un rastro de validación transparente."
        actions={
          <>
            <Button
              asChild
              className="gap-2 bg-[color:var(--navy)] text-[color:var(--navy-foreground)] hover:bg-[color:var(--navy)]/90"
            >
              <Link to="/clinical-ai">
                Abrir OR IA Clínica <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/knowledge-base">
                <Upload className="h-4 w-4" /> Subir fuente de conocimiento
              </Link>
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Plataforma · este mes
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
              Resumen operativo
            </h2>
          </div>
          <Link
            to="/analytics"
            className="text-[12px] font-medium text-[color:var(--ring)] hover:underline"
          >
            Abrir analítica →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          <MetricCard
            label="Oftalmólogos verificados"
            value="2.400+"
            hint="En 38 países"
            icon={Users}
          />
          <MetricCard
            label="Fuentes aprobadas"
            value="128"
            hint="Todas las subespecialidades"
            icon={Library}
          />
          <MetricCard
            label="Interacciones de IA"
            value="342"
            hint="vs. mes anterior"
            icon={MessagesSquare}
            trend="+18%"
            trendDirection="up"
          />
          <MetricCard
            label="Revisiones editoriales pendientes"
            value="18"
            hint="A la espera del editor médico"
            icon={ListChecks}
          />
          <MetricCard
            label="Respuestas KOL verificadas"
            value="7"
            hint="Validadas este trimestre"
            icon={BadgeCheck}
            accent="gold"
          />
          <MetricCard
            label="Feedback útil"
            value="92%"
            hint="Últimos 30 días"
            icon={Sparkles}
            trend="+3pt"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Espacios de trabajo
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
            Separación clara entre IA educativa, evidencia, razonamiento y validación
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {WORKSPACES.map((w) => {
            const Icon = w.icon;
            return (
              <Link key={w.href} to={w.href} className="group">
                <Card className="relative h-full overflow-hidden border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-all hover:border-[color:var(--ring)]/30 hover:shadow-[var(--shadow-elevated)]">
                  <span
                    aria-hidden
                    className={
                      w.chipTone === "gold"
                        ? "absolute inset-y-0 left-0 w-[3px] bg-gradient-gold"
                        : "absolute inset-y-0 left-0 w-[3px] bg-[color:var(--ring)]/30 group-hover:bg-[color:var(--ring)]/60 transition-colors"
                    }
                  />
                  <div className="flex items-start gap-4">
                    <div
                      className={
                        w.chipTone === "gold"
                          ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/10 text-[color:var(--gold)]"
                          : "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[color:var(--ring)]"
                      }
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-serif text-[17px] font-semibold text-foreground">
                          {w.title}
                        </h3>
                        <ModeChip label={w.chip} tone={w.chipTone} />
                      </div>
                      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                        {w.description}
                      </p>
                      <div className="inline-flex items-center gap-1 pt-1 text-[12px] font-medium text-[color:var(--ring)] transition-all group-hover:gap-1.5">
                        Abrir espacio <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-foreground">
              Actividad reciente de la plataforma
            </h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="divide-y divide-border text-[13px]">
            {[
              {
                t: "KOL aprobó",
                d: "Dr. M. García — DMEK en ojos post-trabeculectomía",
                time: "hace 2h",
                tone: "gold",
              },
              {
                t: "Revisión editorial",
                d: "Selección de MIGS en glaucoma leve-moderado — enviado a KOL",
                time: "hace 5h",
                tone: "blue",
              },
              {
                t: "Nueva fuente",
                d: "AAO 2024 Preferred Practice Pattern — Glaucoma añadido a la recuperación",
                time: "Ayer",
                tone: "blue",
              },
              {
                t: "Evento de seguridad",
                d: "Término de urgencia detectado — la respuesta se mantuvo educativa",
                time: "hace 2d",
                tone: "warn",
              },
            ].map((row, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span
                  className={
                    row.tone === "gold"
                      ? "h-2 w-2 rounded-full bg-[color:var(--gold)]"
                      : row.tone === "warn"
                        ? "h-2 w-2 rounded-full bg-[color:var(--warning)]"
                        : "h-2 w-2 rounded-full bg-[color:var(--ring)]"
                  }
                />
                <span className="w-44 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.t}
                </span>
                <span className="flex-1 text-foreground">{row.d}</span>
                <span className="text-[11px] text-muted-foreground">{row.time}</span>
              </li>
            ))}
          </ul>
        </Card>

        <EducationalUseBanner />
      </section>
    </div>
  );
}
