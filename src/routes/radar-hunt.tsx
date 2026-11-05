import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Award,
  BadgeCheck,
  Building2,
  Eye,
  Home,
  Map as MapIcon,
  Radio,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { DemoModeNotice } from "@/components/radar-hunt/ui";

export const Route = createFileRoute("/radar-hunt")({
  head: () => ({
    meta: [
      { title: "Radar Hunt · Play. Learn. Discover." },
      {
        name: "description",
        content:
          "Ligas internacionales de oftalmología, retos BOSS y el Eye Universe interactivo en 3D.",
      },
    ],
  }),
  component: RadarHuntLayout,
});

const TABS = [
  { to: "/radar-hunt", label: "Inicio", icon: Home, exact: true },
  { to: "/radar-hunt/eye", label: "Eye Universe", icon: Eye },
  { to: "/radar-hunt/ligas", label: "Ligas", icon: Trophy },
  { to: "/radar-hunt/boss", label: "Retos BOSS", icon: Swords },
  { to: "/radar-hunt/congresos", label: "Congresos", icon: Radio },
  { to: "/radar-hunt/temporada", label: "Temporada", icon: MapIcon },
  { to: "/radar-hunt/premios", label: "Premios", icon: Award },
  { to: "/radar-hunt/perfil", label: "Mi perfil", icon: UserRound },
  { to: "/radar-hunt/industria", label: "Industria", icon: Building2 },
] as const;

function RadarHuntLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const canReview = role === "admin" || role === "medical_editor";
  const tabs = canReview
    ? [
        ...TABS,
        { to: "/radar-hunt/verificaciones", label: "Verificaciones", icon: BadgeCheck } as const,
      ]
    : TABS;
  return (
    <div className="rh-theme mx-auto flex max-w-7xl flex-col gap-5">
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface/80 p-1 backdrop-blur"
        aria-label="Radar Hunt"
      >
        {tabs.map((t) => {
          const active =
            "exact" in t && t.exact ? path === t.to || path === `${t.to}/` : path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[color:var(--navy)] text-white shadow-[inset_0_-2px_0_0_var(--rh-radar-500)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <DemoModeNotice />
      <Outlet />
    </div>
  );
}
