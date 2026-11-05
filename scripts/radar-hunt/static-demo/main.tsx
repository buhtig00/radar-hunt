// Entrada de la versión estática de demostración: solo navegador, historial en memoria
// (el artefacto solo pasa «#nombre» en la URL) y atajos por hash: #ojo, #congreso, #sala…
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { Route as RootRoute } from "@/routes/__root";
import "@/styles.css";

// El «shell» <html> de TanStack Start no aplica: montamos dentro de un <div>.
(RootRoute.options as { shellComponent?: unknown }).shellComponent = undefined;

const SHORTCUTS: Record<string, string> = {
  inicio: "/radar-hunt",
  ojo: "/radar-hunt/eye",
  ligas: "/radar-hunt/ligas",
  boss: "/radar-hunt/boss",
  perfil: "/radar-hunt/perfil",
  congreso: "/radar-hunt/congresos/congreso-demo",
  congresos: "/radar-hunt/congresos",
  organizacion: "/radar-hunt/congresos/congreso-demo/admin",
  sala: "/sala/congreso-demo",
  temporada: "/radar-hunt/temporada",
  premios: "/radar-hunt/premios",
  industria: "/radar-hunt/industria",
};
// Eye Universe por especialidad: #ojo-glaucoma, #ojo-oculoplastia… y #estacion-GLA-02
const fromHash = () => {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const track = /^ojo-([a-z]+)$/.exec(h)?.[1];
  if (track) return `/radar-hunt/eye?recorrido=${track}`;
  const station = /^estacion-([A-Za-z]{3}-\d{2})$/.exec(h)?.[1];
  if (station) return `/radar-hunt/eye?estacion=${station.toUpperCase()}`;
  return SHORTCUTS[h] ?? "/radar-hunt";
};

const router = createRouter({
  routeTree,
  context: { queryClient: new QueryClient() },
  history: createMemoryHistory({ initialEntries: [fromHash()] }),
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});
window.addEventListener("hashchange", () => void router.navigate({ to: fromHash() }));
router.subscribe("onResolved", () => window.scrollTo(0, 0));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
