// Enlace a la pantalla de sala: pestaña nueva en la app; misma pestaña en la demo estática.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { IS_STATIC_DEMO } from "@/lib/radar-hunt/static";

export function SalaLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className: string;
  children: ReactNode;
}) {
  if (IS_STATIC_DEMO)
    return (
      <Link to="/sala/$slug" params={{ slug }} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={`/sala/${slug}`} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
