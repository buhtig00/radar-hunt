import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/empty-loading";
import { APP_FORCE_DEMO } from "@/lib/app-deploy";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  // Modo demo forzado: sin Supabase no hay sesiones; se usa el rol simulado de la barra superior.
  const [state, setState] = useState<"checking" | "authed" | "anon">(
    APP_FORCE_DEMO ? "authed" : "checking",
  );

  useEffect(() => {
    if (APP_FORCE_DEMO) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState(data.session ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "authed" : "anon");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state === "anon") {
      navigate({
        to: "/login",
        search: { redirect: window.location.pathname + window.location.search },
        replace: true,
      });
    }
  }, [state, navigate]);

  if (state !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Verificando sesión…" />
      </div>
    );
  }

  return <Outlet />;
}
