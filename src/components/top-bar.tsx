import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRole } from "@/lib/role-context";
import { useI18n, type UILocale } from "@/lib/i18n";
import type { Role } from "@/lib/types";
import { SUPABASE_MODE } from "@/lib/db/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  UserRound,
  Bell,
  Database,
  ShieldCheck,
  Languages,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_FORCE_DEMO } from "@/lib/app-deploy";
import { useNavigate } from "@tanstack/react-router";

const ROLES: Role[] = ["admin", "medical_editor", "kol", "verified_doctor", "industry_user"];
const LOCALES: { code: UILocale; label: string }[] = [
  { code: "es", label: "ES · Español" },
  { code: "en", label: "EN · English" },
];

export function TopBar() {
  const { role, setRole } = useRole();
  const { t, locale, setLocale, roleLabel } = useI18n();
  const liveMode = SUPABASE_MODE === "live";
  const navigate = useNavigate();

  async function handleLogout() {
    if (APP_FORCE_DEMO) {
      navigate({ to: "/", replace: true });
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { redirect: "/" }, replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />

      <div className="hidden md:flex md:items-center md:gap-2 md:text-[13px]">
        <span className="text-foreground font-medium tracking-tight">Ophthalmology Radar</span>
        <span className="text-border">/</span>
        <span className="text-muted-foreground">{t("topbar.breadcrumb")}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className={
            liveMode
              ? "hidden sm:inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-[color:var(--success)]"
              : "hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
          }
          title={liveMode ? t("topbar.live_tooltip") : t("topbar.demo_tooltip")}
        >
          <Database className="h-3 w-3" />
          {liveMode ? t("topbar.live") : t("topbar.demo")}
        </span>

        <span className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] font-medium text-[color:var(--gold-foreground)]">
          <ShieldCheck className="h-3 w-3 text-[color:var(--gold)]" />
          {t("topbar.badge")}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("topbar.language")}
              className="h-9 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Languages className="h-4 w-4" />
              <span className="text-[12px] font-semibold uppercase tracking-wide">{locale}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("topbar.language")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LOCALES.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
                <span className="flex-1 text-sm">{l.label}</span>
                {l.code === locale && (
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--ring)]">
                    {t("topbar.role_active")}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t("topbar.notifications")}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-border bg-surface">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <span className="text-foreground">{roleLabel(role)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("topbar.role_menu")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLES.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                <span className="flex-1 text-sm">{roleLabel(r)}</span>
                {r === role && (
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--ring)]">
                    {t("topbar.role_active")}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
