import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { RoleProvider } from "../lib/role-context";
import { I18nProvider } from "../lib/i18n";
import { AppShell } from "../components/app-shell";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
          Esta página no se ha cargado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo ha fallado en nuestro lado. Puedes intentar refrescar o volver al panel principal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al panel
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Capa de Inteligencia · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Una capa controlada de IA para educación oftalmológica, búsqueda de evidencia y apoyo al razonamiento clínico — para oftalmólogos verificados.",
      },
      { name: "author", content: "Ophthalmology Radar" },
      { property: "og:title", content: "Capa de Inteligencia · Ophthalmology Radar" },
      {
        property: "og:description",
        content:
          "La primera capa vertical de IA para oftalmología — verificada, validada por KOL y revisada editorialmente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Capa de Inteligencia · Ophthalmology Radar" },
      {
        name: "description",
        content: "Ophthalmology Radar Intelligence Layer: an AI assistant for ophthalmologists.",
      },
      {
        property: "og:description",
        content: "Ophthalmology Radar Intelligence Layer: an AI assistant for ophthalmologists.",
      },
      {
        name: "twitter:description",
        content: "Ophthalmology Radar Intelligence Layer: an AI assistant for ophthalmologists.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f580ceea-229a-4aae-a1f8-2331fb28e10a/id-preview-5f7c6ef8--8caa90e6-d0df-4364-8848-230b0fb99733.lovable.app-1780306487225.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f580ceea-229a-4aae-a1f8-2331fb28e10a/id-preview-5f7c6ef8--8caa90e6-d0df-4364-8848-230b0fb99733.lovable.app-1780306487225.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Instrument+Serif:ital@0;1&family=Source+Serif+4:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Radar Hunt y la pantalla de sala van en tema oscuro inmersivo; se marca en <html> para que
  // los portales (menús, diálogos, hojas) hereden el tema.
  const path = useRouterState({ select: (s) => s.location.pathname });
  const immersive =
    path === "/radar-hunt" || path.startsWith("/radar-hunt/") || path.startsWith("/sala/");
  return (
    <html lang="es" className={immersive ? "dark rh-root" : undefined}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RoleProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster richColors position="top-right" />
        </RoleProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
