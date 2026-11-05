/**
 * Atlas / Evidence data hooks.
 *
 * Combinan los arrays estáticos de demostración (ophthalmology-atlas.ts,
 * ophthalmology-evidence.ts) con el contenido aprobado de las tablas
 * `oph_*` en Supabase, vía TanStack Query. El contenido de la base de datos
 * se muestra primero y los estáticos rellenan el resto.
 */

import { useQuery } from "@tanstack/react-query";
import {
  ATLAS_PATHOLOGIES,
  ATLAS_DRUGS,
  ATLAS_DEVICES,
  ATLAS_GUIDELINES,
  ATLAS_CLASSIFICATIONS,
  type AtlasPathology,
  type AtlasDrug,
  type AtlasDevice,
  type AtlasGuideline,
  type AtlasClassification,
} from "@/lib/ophthalmology-atlas";
import { CLINICAL_PROTOCOLS, type ClinicalProtocol } from "@/lib/ophthalmology-evidence";
import {
  fetchOphPathologies,
  fetchOphMedications,
  fetchOphMedicationsRich,
  fetchOphDevices,
  fetchOphGuidelines,
  fetchOphClassifications,
  fetchOphProtocols,
  type RichMedication,
} from "@/lib/services/oph-atlas";

interface Combined<T> {
  items: T[];
  dbCount: number;
  isLoading: boolean;
}

function combine<T>(staticItems: T[], dbItems: T[] | undefined, isLoading: boolean): Combined<T> {
  const items = [...(dbItems ?? []), ...staticItems];
  return { items, dbCount: dbItems?.length ?? 0, isLoading };
}

export function useAtlasPathologies(): Combined<AtlasPathology> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "pathologies"],
    queryFn: fetchOphPathologies,
    staleTime: 5 * 60 * 1000,
  });
  return combine(ATLAS_PATHOLOGIES, data, isLoading);
}

export function useAtlasDrugs(): Combined<AtlasDrug> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "medications"],
    queryFn: fetchOphMedications,
    staleTime: 5 * 60 * 1000,
  });
  return combine(ATLAS_DRUGS, data, isLoading);
}

export function useAtlasDevices(): Combined<AtlasDevice> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "devices"],
    queryFn: fetchOphDevices,
    staleTime: 5 * 60 * 1000,
  });
  return combine(ATLAS_DEVICES, data, isLoading);
}

export function useAtlasGuidelines(): Combined<AtlasGuideline> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "guidelines"],
    queryFn: fetchOphGuidelines,
    staleTime: 5 * 60 * 1000,
  });
  return combine(ATLAS_GUIDELINES, data, isLoading);
}

export function useAtlasClassifications(): Combined<AtlasClassification> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "classifications"],
    queryFn: fetchOphClassifications,
    staleTime: 5 * 60 * 1000,
  });
  return combine(ATLAS_CLASSIFICATIONS, data, isLoading);
}

export function useClinicalProtocols(): Combined<ClinicalProtocol> {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "protocols"],
    queryFn: fetchOphProtocols,
    staleTime: 5 * 60 * 1000,
  });
  return combine(CLINICAL_PROTOCOLS, data, isLoading);
}

export function useRichMedications() {
  const { data, isLoading } = useQuery({
    queryKey: ["oph", "medications", "rich"],
    queryFn: fetchOphMedicationsRich,
    staleTime: 5 * 60 * 1000,
  });
  return { items: (data ?? []) as RichMedication[], dbCount: data?.length ?? 0, isLoading };
}
