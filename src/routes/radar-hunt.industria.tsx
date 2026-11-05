import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Layers,
  MonitorPlay,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { rhc } from "@/lib/radar-hunt/congress/service";
import { proposalSchema } from "@/lib/radar-hunt/proposal";
import type { ProposalInput } from "@/lib/radar-hunt/congress/service-types";
import { RhHero } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt/industria")({
  head: () => ({
    meta: [
      { title: "Industria, congresos y sociedades · Radar Hunt" },
      {
        name: "description",
        content:
          "Lleva Radar Hunt a tu congreso: estaciones con QR, retos en sala y pantalla en directo, con contenido científico independiente y datos solo agregados.",
      },
    ],
  }),
  component: IndustryPage,
});

function IndustryPage() {
  return (
    <div className="flex flex-col gap-8">
      <RhHero
        eyebrow="Para congresos, sociedades e industria"
        title={
          <>
            Tu stand, <em>una estación.</em>
          </>
        }
        actions={
          <>
            <a href="#propuesta" className="rh-cta rounded-full px-5 py-2.5 text-sm font-semibold">
              Solicitar propuesta
            </a>
            <Link
              to="/radar-hunt/congresos"
              className="rh-glass rounded-full px-5 py-2.5 text-sm font-medium text-white"
            >
              Ver la demo del congreso
            </Link>
          </>
        }
      >
        Radar Hunt convierte el congreso en un recorrido científico: estaciones con QR por la sede,
        retos en sala en directo y una clasificación que el congresista quiere mirar. La ciencia
        manda: el contenido es independiente y los datos solo se comparten agregados.
      </RhHero>

      <section className="grid gap-4 md:grid-cols-3">
        <Offer icon={<QrCode className="h-5 w-5" />} title="Estación con apoyo">
          Tu stand aloja una estación oficial con un reto del banco editorial de su subespecialidad.
          Da los <strong>mismos RP</strong> que cualquier otra estación. El patrocinio se muestra
          siempre con un texto de transparencia y la marca no elabora, elige ni revisa las
          preguntas.
        </Offer>
        <Offer icon={<MonitorPlay className="h-5 w-5" />} title="Sesión en directo">
          Retos y encuestas de sala durante una ponencia, con pantalla para el proyector. La sesión
          puede contar con apoyo; los retos salen del banco validado por KOL y las encuestas son de
          opinión de la sesión, nunca de producto.
        </Offer>
        <Offer icon={<BarChart3 className="h-5 w-5" />} title="Estudios de mercado (aparte)">
          Fuera de la competición y sin RP. Con consentimiento propio y resultados solo agregados
          (mínimo 20 respuestas por celda). Nunca datos individuales ni contactos. Módulo en
          desarrollo.
        </Offer>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xl">
            Lo que <em>recibe</em> cada parte
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <Item who="Congreso y sociedad">
              Plataforma del evento, pósteres QR, pantalla de sala, panel de organización con
              métricas en directo, exportaciones y valoración del congreso.
            </Item>
            <Item who="Patrocinador">
              Informe agregado de su estación o sesión: visitas, retos completados, puntuación media
              y valoración. Sin datos personales ni listas de contactos.
            </Item>
            <Item who="Congresista">
              Un recorrido con sentido por la exposición y las salas, aprendizaje con referencia en
              cada respuesta y reconocimiento académico (nunca premios en metálico).
            </Item>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-[color:var(--gold)]" /> Las reglas{" "}
            <em>de la competición</em>
          </h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["Expositor ≠ Partner", "Sin acuerdo firmado no hay estación patrocinada."],
              [
                "Ciencia sin marca",
                "Preguntas del banco editorial, validadas por KOL y con referencia.",
              ],
              [
                "Premios ≠ Recompensas",
                "Reconocimiento académico; sin dinero, sorteos ni regalos de valor.",
              ],
              [
                "El servidor manda",
                "El tiempo y los puntos los calcula el servidor; la respuesta nunca está en el móvil.",
              ],
              ["Datos agregados", "La industria nunca ve respuestas individuales."],
              ["Sin GPS", "La presencia se acredita con el QR de la estación."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-xl border border-border px-3 py-2">
                <div className="font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Diseñado para encajar con los códigos de Farmaindustria, EFPIA y MedTech Europe y con el
            RGPD. Pendiente de revisión por asesoría legal.
          </p>
        </div>
      </section>

      <section className="grid items-center gap-4 rounded-3xl border border-border bg-surface p-6 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="flex items-center gap-2 text-xl">
            <Layers className="h-5 w-5 text-[color:var(--gold)]" /> Un motor,{" "}
            <em>todas las especialidades.</em>
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            El mismo motor (ligas, verificación de colegiados, banco editorial, modo congreso) sirve
            a otras sociedades médicas con su propio órgano como mapa. Ophthalmology Radar es la
            primera vertical.
          </p>
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> Marca blanca bajo acuerdo
        </span>
      </section>

      <ProposalForm />
    </div>
  );
}

function Offer({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--navy)] text-[color:var(--rh-radar-300)]">
        {icon}
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Item({ who, children }: { who: string; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold)]" />
      <span>
        <strong>{who}.</strong> <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

const EMPTY: ProposalInput = {
  name: "",
  organization: "",
  role: "",
  kind: "congreso",
  email: "",
  message: "",
  consent: false,
  website: "",
};

function ProposalForm() {
  const [f, setF] = useState<ProposalInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (p: Partial<ProposalInput>) => setF((x) => ({ ...x, ...p }));
  const input = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";
  const submit = async () => {
    const parsed = proposalSchema.safeParse(f);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[String(i.path[0])] ??= i.message;
      setErrors(e);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await rhc.requestProposal(f);
      setDone(true);
      toast.success("Solicitud enviada. Te responderemos en 2 días laborables.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <section
        id="propuesta"
        className="rounded-3xl border border-border bg-surface p-6 text-center"
      >
        <CheckCircle2 className="mx-auto h-8 w-8 text-[color:var(--success)]" />
        <h2 className="mt-2 text-xl">Solicitud recibida</h2>
        <p className="text-sm text-muted-foreground">
          {rhc.mode === "demo"
            ? "En la demo la solicitud se guarda solo en este navegador."
            : "El equipo de Ophthalmology Radar te responderá en 2 días laborables."}
        </p>
      </section>
    );
  const err = (k: string) =>
    errors[k] ? <span className="text-xs text-destructive">{errors[k]}</span> : null;
  return (
    <form
      id="propuesta"
      className="grid gap-3 rounded-3xl border border-border bg-surface p-6 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <div className="md:col-span-2">
        <h2 className="flex items-center gap-2 text-xl">
          <Building2 className="h-5 w-5 text-[color:var(--gold)]" /> Trae Radar Hunt{" "}
          <em>a tu congreso.</em>
        </h2>
        <p className="text-sm text-muted-foreground">
          Cuéntanos qué evento o qué idea tienes y te preparamos una propuesta.
        </p>
      </div>
      <Field id="pr-name" label="Nombre y apellidos">
        <input
          id="pr-name"
          className={input}
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
          aria-invalid={!!errors.name}
        />
        {err("name")}
      </Field>
      <Field id="pr-org" label="Organización">
        <input
          id="pr-org"
          className={input}
          value={f.organization}
          onChange={(e) => set({ organization: e.target.value })}
          aria-invalid={!!errors.organization}
        />
        {err("organization")}
      </Field>
      <Field id="pr-kind" label="Soy">
        <select
          id="pr-kind"
          className={input}
          value={f.kind}
          onChange={(e) => set({ kind: e.target.value as ProposalInput["kind"] })}
        >
          <option value="congreso">Organización de un congreso</option>
          <option value="sociedad">Sociedad científica</option>
          <option value="industria">Industria (farmacia o dispositivos)</option>
          <option value="otro">Otro</option>
        </select>
      </Field>
      <Field id="pr-role" label="Cargo (opcional)">
        <input
          id="pr-role"
          className={input}
          value={f.role}
          onChange={(e) => set({ role: e.target.value })}
        />
      </Field>
      <Field id="pr-email" label="Correo electrónico profesional">
        <input
          id="pr-email"
          type="email"
          className={input}
          value={f.email}
          onChange={(e) => set({ email: e.target.value })}
          aria-invalid={!!errors.email}
        />
        {err("email")}
      </Field>
      <div className="hidden" aria-hidden>
        <label htmlFor="pr-website">No rellenar</label>
        <input
          id="pr-website"
          tabIndex={-1}
          autoComplete="off"
          value={f.website}
          onChange={(e) => set({ website: e.target.value })}
        />
      </div>
      <Field id="pr-msg" label="¿Qué te gustaría hacer?" wide>
        <textarea
          id="pr-msg"
          className={`${input} min-h-28`}
          value={f.message}
          maxLength={1500}
          onChange={(e) => set({ message: e.target.value })}
          aria-invalid={!!errors.message}
        />
        {err("message")}
      </Field>
      <div className="flex items-start gap-2 text-sm md:col-span-2">
        <input
          id="pr-consent"
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={f.consent}
          onChange={(e) => set({ consent: e.target.checked })}
          aria-invalid={!!errors.consent}
        />
        <label htmlFor="pr-consent" className="text-muted-foreground">
          Acepto que Ophthalmology Radar use estos datos solo para responder a esta solicitud.
          {err("consent") && <span className="block">{err("consent")}</span>}
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rh-cta justify-self-start rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Enviando…" : "Solicitar propuesta"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  children,
  wide,
}: {
  id: string;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${wide ? "md:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
