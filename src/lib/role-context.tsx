import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./types";

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

const RoleContext = createContext<RoleCtx | null>(null);

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  medical_editor: "Editor médico",
  kol: "KOL (líder de opinión)",
  verified_doctor: "Oftalmólogo verificado",
  industry_user: "Usuario industria",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("or-role");
    if (stored && stored in ROLE_LABELS) setRoleState(stored as Role);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") window.localStorage.setItem("or-role", r);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole debe usarse dentro de RoleProvider");
  return ctx;
}
