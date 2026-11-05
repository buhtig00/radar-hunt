import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Stethoscope,
  GraduationCap,
  ClipboardList,
  Library,
  ShieldCheck,
  BadgeCheck,
  BarChart3,
  Settings,
  Eye,
  ListChecks,
  BookOpen,
  FlaskConical,
  Edit3,
  Activity,
  Trophy,
  Swords,
  UserRound,
  Crosshair,
  Radio,
  Map as MapIcon,
  Award,
  Building2,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

type Item = {
  titleKey: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
};

const GROUPS: { labelKey: string; items: Item[] }[] = [
  {
    labelKey: "nav.group.overview",
    items: [{ titleKey: "nav.dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    labelKey: "Radar Hunt",
    items: [
      { titleKey: "Radar Hunt", url: "/radar-hunt", icon: Crosshair },
      { titleKey: "Eye Universe 3D", url: "/radar-hunt/eye", icon: Eye },
      { titleKey: "Ligas", url: "/radar-hunt/ligas", icon: Trophy },
      { titleKey: "Retos BOSS", url: "/radar-hunt/boss", icon: Swords },
      { titleKey: "Congresos en directo", url: "/radar-hunt/congresos", icon: Radio },
      { titleKey: "Temporada y Gran Final", url: "/radar-hunt/temporada", icon: MapIcon },
      { titleKey: "Premios y recompensas", url: "/radar-hunt/premios", icon: Award },
      { titleKey: "Industria y congresos", url: "/radar-hunt/industria", icon: Building2 },
      { titleKey: "Mi perfil y verificación", url: "/radar-hunt/perfil", icon: UserRound },
      {
        titleKey: "Verificaciones",
        url: "/radar-hunt/verificaciones",
        icon: BadgeCheck,
        roles: ["admin", "medical_editor"],
      },
    ],
  },
  {
    labelKey: "nav.group.intelligence",
    items: [
      {
        titleKey: "nav.clinical_ai",
        url: "/clinical-ai",
        icon: Stethoscope,
        roles: ["admin", "medical_editor", "kol", "verified_doctor"],
      },
      {
        titleKey: "nav.academy_tutor",
        url: "/academy-tutor",
        icon: GraduationCap,
        roles: ["admin", "medical_editor", "kol", "verified_doctor"],
      },
      {
        titleKey: "nav.case_analysis",
        url: "/case-analysis",
        icon: ClipboardList,
        roles: ["admin", "medical_editor", "verified_doctor"],
      },
    ],
  },
  {
    labelKey: "nav.group.editorial",
    items: [
      {
        titleKey: "nav.knowledge_base",
        url: "/knowledge-base",
        icon: Library,
        roles: ["admin", "medical_editor"],
      },
      {
        titleKey: "Editor de contenido",
        url: "/content-editor",
        icon: Edit3,
        roles: ["admin", "medical_editor"],
      },
      { titleKey: "nav.atlas", url: "/atlas", icon: BookOpen },
      { titleKey: "nav.evidence", url: "/evidence", icon: FlaskConical },
      {
        titleKey: "nav.editorial_review",
        url: "/editorial-review",
        icon: ShieldCheck,
        roles: ["admin", "medical_editor"],
      },
      {
        titleKey: "nav.kol_verification",
        url: "/kol-verification",
        icon: BadgeCheck,
        roles: ["admin", "kol", "medical_editor"],
      },
    ],
  },
  {
    labelKey: "nav.group.insights",
    items: [
      {
        titleKey: "nav.analytics",
        url: "/analytics",
        icon: BarChart3,
        roles: ["admin", "industry_user", "medical_editor"],
      },
      { titleKey: "nav.settings", url: "/settings", icon: Settings, roles: ["admin"] },
      { titleKey: "Estado del sistema", url: "/system-status", icon: Activity, roles: ["admin"] },
      {
        titleKey: "nav.implementation",
        url: "/implementation-checklist",
        icon: ListChecks,
        roles: ["admin"],
      },
    ],
  },
];

export function AppSidebar({ role }: { role: Role }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));
  const { t } = useI18n();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold text-[color:var(--gold-foreground)] shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.4)]">
            <Eye className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">
              Ophthalmology Radar
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--gold)]/85">
              {t("brand.tagline")}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {GROUPS.map((group) => {
          const visible = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (!visible.length) return null;
          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
                {t(group.labelKey)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = isActive(item.url);
                    const title = t(item.titleKey);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={title}
                          className="relative h-9 text-[13px] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                        >
                          <Link to={item.url} className="flex items-center gap-2.5">
                            {active && (
                              <span
                                aria-hidden
                                className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[color:var(--gold)]"
                              />
                            )}
                            <item.icon className="h-4 w-4" strokeWidth={1.85} />
                            <span>{title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 p-2.5 text-[11px] leading-snug text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          <span className="font-medium text-sidebar-foreground/90">
            {t("shell.educational_footer.title")}
          </span>
          <br />
          {t("shell.educational_footer.body")}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
