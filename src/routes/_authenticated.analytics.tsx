import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { getAnalyticsKpis } from "@/lib/analytics.functions";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Globe2,
  HeartPulse,
  Library,
  ShieldAlert,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analítica · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Analítica agregada y anónima de la Capa de Inteligencia de OR — tendencias por subespecialidad, mezcla de idiomas y brechas formativas.",
      },
      { property: "og:title", content: "Analítica OR" },
      {
        property: "og:description",
        content: "Insights agregados para decisiones educativas y operativas.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const subspecialtyData = [
  { name: "Retina", value: 128 },
  { name: "Córnea", value: 96 },
  { name: "Glaucoma", value: 72 },
  { name: "Catarata", value: 64 },
  { name: "Uveítis", value: 38 },
  { name: "Superficie ocular", value: 34 },
  { name: "Neuro-Oft", value: 22 },
];

const languageData = [
  { name: "Español", value: 60 },
  { name: "Inglés", value: 40 },
];

const trendData = [
  { m: "May", q: 120 },
  { m: "Jun", q: 165 },
  { m: "Jul", q: 198 },
  { m: "Ago", q: 224 },
  { m: "Sep", q: 286 },
  { m: "Oct", q: 342 },
];

const gapsData = [
  { name: "Intervalos anti-VEGF", value: 42 },
  { name: "DMEK en ojos con glaucoma", value: 36 },
  { name: "Selección de MIGS", value: 31 },
  { name: "Seguimiento queratocono", value: 24 },
  { name: "Treat-and-extend EMD", value: 21 },
];

const topicData = [
  { name: "Queratopigmentación", value: 28 },
  { name: "MIGS", value: 24 },
  { name: "DMEK", value: 21 },
  { name: "Masterclass OSD", value: 18 },
];

const flagsData = [
  { name: "Evidencia limitada", value: 18 },
  { name: "Requiere revisión especialista", value: 12 },
  { name: "Datos faltantes", value: 9 },
  { name: "Signo de alarma", value: 4 },
];

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function AnalyticsPage() {
  const kpiFn = useServerFn(getAnalyticsKpis);
  const kpis = useQuery({ queryKey: ["analytics-kpis"], queryFn: () => kpiFn() });
  const k = kpis.data;
  const nf = new Intl.NumberFormat("es-ES");
  const show = (v: number | null | undefined) =>
    kpis.isLoading ? "…" : v === null || v === undefined ? "—" : nf.format(v);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Analítica"
        title="Analítica OR"
        description="Insights agregados y anónimos sobre cómo se está utilizando la Capa de Inteligencia."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Consultas totales a la IA"
          value={show(k?.total_interactions)}
          icon={Activity}
          hint="Histórico"
        />
        <MetricCard
          label="Consultas este mes"
          value={show(k?.interactions_this_month)}
          icon={BarChart3}
          hint="Mes en curso"
        />
        <MetricCard
          label="Subespecialidad más activa"
          value={kpis.isLoading ? "…" : (k?.top_subspecialty ?? "—")}
          icon={HeartPulse}
          hint={
            k?.top_subspecialty_count
              ? `${k.top_subspecialty_count} consultas este mes`
              : "Sin datos este mes"
          }
        />
        <MetricCard
          label="Utilidad media"
          value={
            kpis.isLoading
              ? "…"
              : k?.usefulness_pct === null || k?.usefulness_pct === undefined
                ? "—"
                : `${k.usefulness_pct}%`
          }
          icon={BadgeCheck}
          hint="Según feedback"
        />
        <MetricCard
          label="Eventos de seguridad"
          value={show(k?.safety_events)}
          icon={ShieldAlert}
          hint={`${k?.safety_critical ?? 0} críticos`}
        />
        <MetricCard
          label="Solicitudes de revisión KOL"
          value={show(k?.kol_requests)}
          icon={BadgeCheck}
          hint="Feedback que pide KOL"
        />
        <MetricCard
          label="Fuentes aprobadas"
          value={show(k?.approved_sources)}
          icon={Library}
          hint="Activas en recuperación"
        />
        <MetricCard label="Idioma principal" value="—" icon={Globe2} hint="Ver gráfico inferior" />
      </div>
      {kpis.isError ? (
        <p className="text-xs text-muted-foreground">
          Las métricas en vivo requieren rol editorial/administrador. Los gráficos siguientes son
          ilustrativos.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Consultas por subespecialidad">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subspecialtyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consultas por idioma">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={languageData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {languageData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia de consultas">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="q"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Principales brechas formativas">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={gapsData} margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis
                dataKey="name"
                type="category"
                width={170}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Temas de curso más solicitados">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topicData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="value" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alertas de seguridad más frecuentes">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={flagsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="value" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="relative overflow-hidden border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs font-medium text-[color:var(--gold-foreground)]">
              <Lock className="h-3 w-3 text-[color:var(--gold)]" /> Vista industria · Próximamente
            </div>
            <h3 className="mt-3 font-serif text-xl font-semibold text-foreground">
              Dashboard de Inteligencia OR
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Insights agregados para partners de pharma y medtech — brechas formativas, interés por
              patología, consumo de contenido y tendencias a nivel país.
            </p>
            <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Nunca se comparten con la industria datos individuales del médico, consultas privadas
              ni datos a nivel paciente.
            </p>
          </div>
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-gold/10 text-[color:var(--gold)]">
            <Lock className="h-8 w-8" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-serif text-base font-semibold text-foreground">{title}</h3>
      {children}
    </Card>
  );
}
