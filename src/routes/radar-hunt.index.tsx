import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Crown,
  Eye,
  GraduationCap,
  Radio,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import { LEAGUES, SUBSPECIALTIES } from "@/lib/radar-hunt/catalog";
import { useSeason } from "@/lib/radar-hunt/congress/hooks";
import { EYE_TRACKS, isStationPassed } from "@/lib/radar-hunt/eye-tracks";
import { useEyeProgress, useMyProfile } from "@/lib/radar-hunt/hooks";
import { RH_IMAGES, SUB_COLORS } from "@/lib/radar-hunt/palette";
import { HUNT_STATIONS } from "@/lib/radar-hunt/seed-hunt-matrix";
import { RhHero, RhProgress, RhSectionTitle } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/")({
  component: RadarHuntHome,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

function RadarHuntHome() {
  return (
    <div className="flex flex-col gap-10">
      <RhHero
        eyebrow="Temporada 2026–2027"
        title={
          <>
            La oftalmología <em>también compite.</em>
          </>
        }
        image={RH_IMAGES.iris}
        actions={
          <>
            <Link
              to="/radar-hunt/ligas"
              className="rh-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <Trophy className="h-4 w-4" /> Jugar ahora
            </Link>
            <Link
              to="/radar-hunt/eye"
              className="rh-glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white"
            >
              <Eye className="h-4 w-4" /> Explorar el ojo en 3D
            </Link>
          </>
        }
        footer={
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <HeroStat value={String(LEAGUES.length)} label="ligas" />
            <HeroStat value={String(SUBSPECIALTIES.length)} label="subespecialidades" />
            <HeroStat value="8" label="Hunts en congresos" />
            <HeroStat value="1" label="Gran Final" />
          </dl>
        }
      >
        Compite en tu especialidad, juega en los congresos de la temporada y aprende con contenido
        validado por expertos. <span className="text-white">Play. Learn. Discover.</span>
      </RhHero>

      <NextSteps />

      <section className="flex flex-col gap-4">
        <RhSectionTitle
          eyebrow="Explora"
          title={
            <>
              Todo Radar Hunt, <em>de un vistazo</em>
            </>
          }
        />
        <div className="grid auto-rows-[210px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImageTile
            to="/radar-hunt/eye"
            image={RH_IMAGES.lens}
            icon={Eye}
            title="Eye Universe"
            text="Recorre un ojo humano en 3D por especialidad: cada estación de los Hunts tiene su sitio en la anatomía."
            className="sm:col-span-2 lg:row-span-2"
            big
          />
          <ImageTile
            to="/radar-hunt/ligas"
            image={RH_IMAGES.fundus}
            icon={Trophy}
            title="Ligas internacionales"
            text="17 subespecialidades, residentes y adjuntos, 10 rondas por temporada."
            className="sm:col-span-2"
          >
            <div className="mt-3 flex gap-1.5">
              {SUBSPECIALTIES.map((s) => (
                <span
                  key={s}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: SUB_COLORS[s] }}
                />
              ))}
            </div>
          </ImageTile>
          <ImageTile
            to="/radar-hunt/boss"
            image={RH_IMAGES.oct}
            icon={Swords}
            title="Retos BOSS"
            text="Casos clínicos que se revelan paso a paso."
          />
          <ImageTile
            to="/radar-hunt/congresos"
            image={RH_IMAGES.cornea}
            icon={Radio}
            title="Congresos en directo"
            text="Estaciones con QR por la sede y retos en sala."
          />
          <GradientTile
            to="/radar-hunt/temporada"
            icon={Crown}
            title="Temporada y Gran Final"
            text="8 Hunts, cuentan tus 5 mejores. Los 16 primeros, a la Gran Final de Barcelona 2027."
            className="sm:col-span-2"
            tone="gold"
          />
          <GradientTile
            to="/radar-hunt/premios"
            icon={Award}
            title="Premios"
            text="Reconocimiento, insignias y experiencias. Sin premios en metálico."
            tone="violet"
          />
          <GradientTile
            to="/radar-hunt/perfil"
            icon={GraduationCap}
            title="Tu formación"
            text="Tu mapa de competencias por subespecialidad."
            tone="teal"
          />
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</dd>
      <span className="text-sm text-white/55">{label}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- Tu siguiente paso */

function NextSteps() {
  const profile = useMyProfile().data;
  const eye = useEyeProgress().data ?? [];
  const season = useSeason().data;

  const passed = eye.filter(isStationPassed).length;
  const total = HUNT_STATIONS.length;
  const nextTrack =
    EYE_TRACKS.find((t) =>
      t.route.some((c) => !eye.some((p) => p.station === c && isStationPassed(p))),
    ) ?? EYE_TRACKS[0];

  const hunt =
    season?.hunts.find((h) => h.gameState === "open") ??
    season?.hunts.find((h) => h.gameState === "upcoming");
  const me = season?.rows.find((r) => r.isMe);
  const verified = profile?.status === "verified";

  return (
    <section className="flex flex-col gap-4">
      <RhSectionTitle
        eyebrow="Para ti"
        title={
          <>
            Tu <em>siguiente paso</em>
          </>
        }
      />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 [&>*]:w-[82%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
        {verified ? (
          <StepCard
            to="/radar-hunt/ligas"
            icon={BadgeCheck}
            accent="#34d399"
            kicker="Verificado"
            title="Ya puedes competir en las ligas"
            cta="Ir a mis ligas"
          >
            Cada semana se abre una ronda de 5 preguntas en tu subespecialidad.
          </StepCard>
        ) : (
          <StepCard
            to="/radar-hunt/perfil"
            icon={ShieldCheck}
            accent="#fbbf24"
            kicker={profile?.status === "pending" ? "En revisión" : "Paso 1"}
            title={
              profile?.status === "pending"
                ? "Tu verificación está en revisión"
                : "Verifícate para competir"
            }
            cta={profile?.status === "pending" ? "Ver mi perfil" : "Verificarme"}
          >
            Las ligas oficiales son solo para médicos verificados con número de colegiado. La
            práctica y los retos BOSS están abiertos.
          </StepCard>
        )}

        <StepCard
          to="/radar-hunt/eye"
          search={{ recorrido: nextTrack.code }}
          icon={Eye}
          accent={nextTrack.color}
          kicker="Eye Universe"
          title={passed ? `Recorrido ${nextTrack.label}` : "Empieza tu recorrido por el ojo"}
          cta={passed ? "Continuar" : "Empezar"}
        >
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <span className="text-lg font-semibold tabular-nums text-white">{passed}</span>
              <span className="text-white/50"> / {total} estaciones superadas</span>
            </span>
          </div>
          <div className="mt-2">
            <RhProgress value={passed / total} />
          </div>
        </StepCard>

        <StepCard
          to={hunt ? "/radar-hunt/congresos/$slug" : "/radar-hunt/temporada"}
          params={hunt ? { slug: hunt.slug } : undefined}
          icon={hunt?.gameState === "open" ? Radio : CalendarDays}
          accent="#22d3ee"
          kicker={hunt?.gameState === "open" ? "Hunt en directo" : "Próximo Hunt"}
          title={hunt?.name ?? "Congresos de la temporada"}
          cta={hunt?.gameState === "open" ? "Jugar el Hunt" : "Ver la temporada"}
          live={hunt?.gameState === "open"}
        >
          {hunt ? (
            <>
              {hunt.city} · {fmtDate(hunt.startsAt)}
              {me && (
                <span className="mt-1 block text-white/50">
                  Vas {me.rank}.º en la temporada · {me.score} pts
                </span>
              )}
            </>
          ) : (
            "Los congresos se anuncian al confirmarse cada acuerdo."
          )}
        </StepCard>
      </div>
    </section>
  );
}

function StepCard({
  to,
  params,
  search,
  icon: Icon,
  accent,
  kicker,
  title,
  cta,
  live,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  icon: typeof Eye;
  accent: string;
  kicker: string;
  title: string;
  cta: string;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      search={search as never}
      className="rh-card rh-card-hover group relative flex flex-col overflow-hidden rounded-3xl p-5"
    >
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        aria-hidden
      />
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: accent }}
        >
          {live && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: accent }}
            />
          )}
          {kicker}
        </span>
      </div>
      <h3 className="mt-4 text-lg leading-snug text-white">{title}</h3>
      <div className="mt-1.5 flex-1 text-sm text-white/60">{children}</div>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- Explora */

function ImageTile({
  to,
  image,
  icon: Icon,
  title,
  text,
  className = "",
  big,
  children,
}: {
  to: string;
  image: string;
  icon: typeof Eye;
  title: string;
  text: string;
  className?: string;
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`group relative isolate flex flex-col justify-end overflow-hidden rounded-3xl border border-white/10 p-5 ${className}`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.12_0.03_252)] via-[oklch(0.12_0.03_252/0.65)] to-transparent"
        aria-hidden
      />
      <span className="mb-auto flex h-9 w-9 items-center justify-center rounded-xl bg-black/35 text-white backdrop-blur">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <h3 className={`text-white ${big ? "text-2xl md:text-3xl" : "text-lg"}`}>{title}</h3>
      <p className={`mt-1 text-white/70 ${big ? "max-w-md text-[15px]" : "text-sm"}`}>{text}</p>
      {children}
      <ArrowRight className="absolute right-5 top-5 h-5 w-5 text-white/60 transition-transform group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}

const TONES = {
  gold: "from-[oklch(0.42_0.08_80)] via-[oklch(0.24_0.05_70)] to-[oklch(0.16_0.03_252)]",
  violet: "from-[oklch(0.4_0.12_295)] via-[oklch(0.22_0.06_285)] to-[oklch(0.16_0.03_252)]",
  teal: "from-[oklch(0.42_0.09_185)] via-[oklch(0.22_0.05_200)] to-[oklch(0.16_0.03_252)]",
} as const;

function GradientTile({
  to,
  icon: Icon,
  title,
  text,
  tone,
  className = "",
}: {
  to: string;
  icon: typeof Eye;
  title: string;
  text: string;
  tone: keyof typeof TONES;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-5 ${TONES[tone]} ${className}`}
    >
      <Icon
        className="absolute -right-4 -top-4 h-32 w-32 text-white/[0.07] transition-transform duration-700 group-hover:rotate-12"
        aria-hidden
      />
      <span className="mb-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <h3 className="text-lg text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/70">{text}</p>
      <ArrowRight className="absolute right-5 top-5 h-5 w-5 text-white/60 transition-transform group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}
