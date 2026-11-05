import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Eye,
  GraduationCap,
  Presentation,
  Swords,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CURRENT_SEASON, LEAGUES, SUBSPECIALTIES } from "@/lib/radar-hunt/catalog";
import { useMyProfile } from "@/lib/radar-hunt/hooks";
import { RhHero, VerificationGate } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/")({
  component: RadarHuntHome,
});

const PILLARS = [
  {
    icon: Eye,
    title: "Eye Universe",
    text: "Navega por un ojo humano en 3D a escala real y entra en cada subespecialidad desde su estructura.",
    to: "/radar-hunt/eye",
    status: "Disponible",
  },
  {
    icon: Trophy,
    title: "Ligas internacionales",
    text: "34 ligas por subespecialidad, separadas para residentes y adjuntos, con rondas, clasificación y finales.",
    to: "/radar-hunt/ligas",
    status: "Disponible",
  },
  {
    icon: Swords,
    title: "Retos BOSS",
    text: "Casos clínicos en varios pasos que revelan información como en la consulta real.",
    to: "/radar-hunt/boss",
    status: "Disponible",
  },
  {
    icon: GraduationCap,
    title: "Formación personalizada",
    text: "Tu mapa de competencias por subespecialidad y recomendaciones con contenido validado.",
    to: "/radar-hunt/perfil",
    status: "Disponible",
  },
  {
    icon: Presentation,
    title: "Congresos en directo",
    text: "Estaciones con QR por la sede, retos y encuestas en sala en directo y pantalla para el proyector.",
    to: "/radar-hunt/congresos",
    status: "Disponible",
  },
  {
    icon: BarChart3,
    title: "Inteligencia de mercado",
    text: "Estudios agregados para la industria, separados de la competición y con privacidad por diseño.",
    status: "Próximamente",
  },
] as const;

function RadarHuntHome() {
  const profile = useMyProfile();
  return (
    <div className="flex flex-col gap-6">
      <RhHero
        eyebrow="Radar Hunt · by Ophthalmology Radar"
        title={
          <>
            La oftalmología <em>también compite.</em>
          </>
        }
        actions={
          <>
            <Link
              to="/radar-hunt/ligas"
              className="rh-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              <Trophy className="h-4 w-4" /> Jugar las ligas
            </Link>
            <Link
              to="/radar-hunt/eye"
              className="rh-glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
            >
              <Eye className="h-4 w-4" /> Entrar en el Eye Universe
            </Link>
          </>
        }
      >
        El universo donde la oftalmología se convierte en conocimiento, competición e innovación.{" "}
        <span className="font-semibold text-white">Play. Learn. Discover.</span> Compite en tu
        especialidad, recorre los congresos de la temporada y aprende con contenido validado por
        KOL.
      </RhHero>

      {profile.data !== undefined && <VerificationGate profile={profile.data} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={String(LEAGUES.length)} label="ligas por temporada" />
        <Stat value={String(SUBSPECIALTIES.length)} label="subespecialidades" />
        <Stat value={CURRENT_SEASON.name.replace("Temporada ", "")} label="temporada en curso" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          const body = (
            <Card className="h-full rounded-2xl border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--navy)] text-[color:var(--rh-radar-300)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.status === "Disponible" ? "bg-success/10 text-[color:var(--success)]" : "bg-muted text-muted-foreground"}`}
                >
                  {p.status}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-lg font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              {"to" in p && (
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Entrar <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Card>
          );
          return "to" in p ? (
            <Link key={p.title} to={p.to} className="block">
              {body}
            </Link>
          ) : (
            <div key={p.title}>{body}</div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Radar Hunt es una plataforma educativa. No ofrece diagnóstico individual ni recomendaciones
        de tratamiento para pacientes concretos.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="font-serif text-3xl font-semibold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
