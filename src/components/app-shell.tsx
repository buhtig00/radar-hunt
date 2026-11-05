import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { DemoModeBanner } from "./demo-banner";
import { useRouterState } from "@tanstack/react-router";
import { useRole } from "@/lib/role-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useRole();
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Pantalla de sala (proyector): a pantalla completa, sin barra lateral ni superior.
  if (path.startsWith("/sala/")) return <>{children}</>;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar role={role} />
        <SidebarInset className="bg-background">
          <DemoModeBanner />
          <TopBar />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
