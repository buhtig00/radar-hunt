// RADAR HUNT — estructura propia (cabecera + barra inferior en móvil), separada del panel
// de Ophthalmology Radar. Tema oscuro inmersivo: la clase `dark rh-root` se pone en <html>
// desde __root.tsx para que menús y diálogos (portales) también salgan en oscuro.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Award,
  BadgeCheck,
  Building2,
  ChevronDown,
  ExternalLink,
  Eye,
  FlaskConical,
  Home,
  Map as MapIcon,
  Menu,
  Radio,
  Swords,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMyProfile } from "@/lib/radar-hunt/hooks";
import { RH_MODE } from "@/lib/radar-hunt/service";
import { ROLE_LABELS, useRole } from "@/lib/role-context";
import type { Role } from "@/lib/types";
import { VerificationBadge } from "./ui";

type NavItem = {
  to: string;
  label: string;
  short?: string;
  icon: typeof Home;
  exact?: boolean;
};

const HOME: NavItem = { to: "/radar-hunt", label: "Inicio", icon: Home, exact: true };
const EYE: NavItem = { to: "/radar-hunt/eye", label: "Eye Universe", short: "Ojo", icon: Eye };
const LEAGUES: NavItem = { to: "/radar-hunt/ligas", label: "Ligas", icon: Trophy };
const BOSS: NavItem = { to: "/radar-hunt/boss", label: "Retos BOSS", short: "BOSS", icon: Swords };
const CONGRESS: NavItem = { to: "/radar-hunt/congresos", label: "Congresos", icon: Radio };
const SEASON: NavItem = { to: "/radar-hunt/temporada", label: "Temporada", icon: MapIcon };
const AWARDS: NavItem = { to: "/radar-hunt/premios", label: "Premios", icon: Award };
const PROFILE: NavItem = { to: "/radar-hunt/perfil", label: "Mi perfil", icon: UserRound };
const INDUSTRY: NavItem = { to: "/radar-hunt/industria", label: "Industria", icon: Building2 };
const REVIEWS: NavItem = {
  to: "/radar-hunt/verificaciones",
  label: "Verificaciones",
  icon: BadgeCheck,
};

/** Navegación principal en escritorio (el logo lleva a Inicio). */
const DESKTOP_NAV = [EYE, LEAGUES, BOSS, CONGRESS, SEASON, AWARDS];
/** Barra inferior en móvil: lo que más se usa, y «Más» para el resto. */
const MOBILE_NAV = [HOME, EYE, LEAGUES, CONGRESS];
const MOBILE_MORE = [BOSS, SEASON, AWARDS, PROFILE, INDUSTRY];

const DEMO_ROLES: Role[] = ["verified_doctor", "admin", "medical_editor", "kol", "industry_user"];

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.to || path === `${item.to}/` : path.startsWith(item.to);
}

export function RhLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" strokeOpacity=".55" />
      <path d="M16 16 L16 1.5 A14.5 14.5 0 0 1 29.2 10 Z" fill="currentColor" fillOpacity=".35" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <circle cx="23.5" cy="8.5" r="1.6" fill="var(--rh-radar-300)" />
    </svg>
  );
}

export function RhShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const canReview = role === "admin" || role === "medical_editor";
  // El <html> del servidor ya lleva «dark rh-root» (__root.tsx); esto cubre la demo estática,
  // que monta la app sin ese shell.
  useEffect(() => {
    const html = document.documentElement;
    const had = html.classList.contains("rh-root");
    html.classList.add("dark", "rh-root");
    return () => {
      if (!had) html.classList.remove("dark", "rh-root");
    };
  }, []);
  // Modo foco: durante una partida no hay navegación que distraiga ni tape las respuestas.
  const focus = path.startsWith("/radar-hunt/jugar/");

  return (
    <div className="rh-theme rh-app relative min-h-screen bg-background text-foreground">
      <div
        className="rh-app-glow pointer-events-none fixed inset-x-0 top-0 h-[520px]"
        aria-hidden
      />
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[color:var(--background)]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link
            to="/radar-hunt"
            className="group flex items-center gap-2.5"
            aria-label="Radar Hunt · Inicio"
          >
            <RhLogo className="h-8 w-8 text-[color:var(--rh-radar-500)] transition-transform duration-500 group-hover:rotate-45" />
            <span className="leading-none">
              <span className="block text-[15px] font-semibold tracking-tight text-white">
                Radar Hunt
              </span>
              <span className="mt-0.5 hidden text-[10.5px] tracking-wide text-white/45 sm:block">
                by Ophthalmology Radar
              </span>
            </span>
          </Link>

          <nav
            className={`ml-4 hidden items-center gap-1 ${focus ? "" : "lg:flex"}`}
            aria-label="Radar Hunt"
          >
            {DESKTOP_NAV.map((item) => {
              const active = isActive(path, item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                    active ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-4 -bottom-[13px] h-0.5 rounded-full bg-[color:var(--rh-radar-500)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {focus ? (
              <Link
                to="/radar-hunt"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" /> Salir
              </Link>
            ) : (
              <>
                <DemoPill />
                <ProfileMenu canReview={canReview} />
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={`relative mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8 ${focus ? "pb-12" : "pb-28 lg:pb-12"}`}
      >
        {children}
        {!focus && (
          <footer className="mt-14 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Radar Hunt es una plataforma educativa: no ofrece diagnóstico ni recomendaciones de
              tratamiento para pacientes concretos.
            </span>
            <Link to="/" className="inline-flex items-center gap-1 hover:text-white/70">
              Ophthalmology Radar <ExternalLink className="h-3 w-3" />
            </Link>
          </footer>
        )}
      </main>

      {!focus && <MobileTabBar path={path} canReview={canReview} />}
    </div>
  );
}

function DemoPill() {
  const { role, setRole } = useRole();
  if (RH_MODE !== "demo") return null;
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rh-radar-500)]/30 bg-[color:var(--rh-radar-500)]/10 px-2.5 py-1 text-[11.5px] font-medium text-[color:var(--rh-radar-300)] transition-colors hover:bg-[color:var(--rh-radar-500)]/20">
        <FlaskConical className="h-3.5 w-3.5" /> Demo
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <div className="font-semibold">Estás en la demostración</div>
        <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
          <li>Tu progreso se guarda solo en este navegador.</li>
          <li>
            Las preguntas tienen referencia pero están{" "}
            <span className="text-foreground">pendientes de validación KOL</span>.
          </li>
          <li>Los participantes de las clasificaciones son ficticios.</li>
        </ul>
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ver la plataforma como
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                r === role
                  ? "border-[color:var(--rh-radar-500)] bg-[color:var(--rh-radar-500)]/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Como Administrador puedes aprobar tu propia verificación en «Verificaciones».
        </p>
      </PopoverContent>
    </Popover>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "RH";
}

function ProfileMenu({ canReview }: { canReview: boolean }) {
  const profile = useMyProfile().data;
  const { role, setRole } = useRole();
  const name = profile?.displayName || "Tu perfil";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 pr-2 transition-colors hover:bg-white/[0.08]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--rh-radar-300)] to-[color:var(--rh-radar-700)] text-[11px] font-bold text-[color:var(--rh-navy-950)]">
          {profile ? initials(name) : <UserRound className="h-4 w-4" />}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-white/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="mt-1.5">
            <VerificationBadge status={profile?.status ?? "unverified"} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MenuLink item={PROFILE} />
        {canReview && <MenuLink item={REVIEWS} />}
        <MenuLink item={INDUSTRY} />
        {RH_MODE === "demo" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Rol de demostración
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
              {DEMO_ROLES.map((r) => (
                <DropdownMenuRadioItem key={r} value={r} className="text-sm">
                  {ROLE_LABELS[r]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Ophthalmology Radar
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <DropdownMenuItem asChild>
      <Link to={item.to} className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {item.label}
      </Link>
    </DropdownMenuItem>
  );
}

function MobileTabBar({ path, canReview }: { path: string; canReview: boolean }) {
  const [open, setOpen] = useState(false);
  const more = canReview ? [...MOBILE_MORE, REVIEWS] : MOBILE_MORE;
  const moreActive = more.some((i) => isActive(path, i));
  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-1 pb-1 pt-2 text-[10.5px] font-medium transition-colors ${
      active ? "text-white" : "text-white/50"
    }`;
  const dot = (active: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
      active ? "bg-[color:var(--rh-radar-500)]/20 text-[color:var(--rh-radar-300)]" : ""
    }`;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[color:var(--background)]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Radar Hunt (móvil)"
    >
      <div className="mx-auto flex max-w-lg">
        {MOBILE_NAV.map((item) => {
          const active = isActive(path, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={tab(active)}
              aria-current={active ? "page" : undefined}
            >
              <span className={dot(active)}>
                <Icon className="h-5 w-5" />
              </span>
              {item.short ?? item.label}
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={tab(moreActive)}>
            <span className={dot(moreActive)}>
              <Menu className="h-5 w-5" />
            </span>
            Más
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <SheetHeader>
              <SheetTitle>Radar Hunt</SheetTitle>
            </SheetHeader>
            <div className="mt-2 grid grid-cols-3 gap-2 px-4">
              {more.map((item) => {
                const Icon = item.icon;
                const active = isActive(path, item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-center text-xs font-medium transition-colors ${
                      active
                        ? "border-[color:var(--rh-radar-500)]/50 bg-[color:var(--rh-radar-500)]/10 text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
