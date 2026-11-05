import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { RoleGuard } from "@/components/role-guard";
import { EDUCATIONAL_DISCLAIMER } from "@/lib/safety";
import { ROLE_LABELS } from "@/lib/role-context";
import type { Role } from "@/lib/types";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAIData } from "@/lib/privacy.functions";
import { getPlatformSettingsFn, savePlatformSettingsFn } from "@/lib/platform-settings.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configuración · Ophthalmology Radar" },
      {
        name: "description",
        content:
          "Configura el proveedor de IA, las opciones de seguridad, los límites de uso, los roles y los disclaimers.",
      },
      { property: "og:title", content: "Configuración" },
      {
        property: "og:description",
        content: "Configuración operativa de la Capa de Inteligencia de OR.",
      },
    ],
  }),
  component: () => (
    <RoleGuard capability="manage_settings">
      <SettingsPage />
    </RoleGuard>
  ),
});

function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Configuración"
        title="Configuración de la plataforma"
        description="Configura cómo se comporta la Capa de Inteligencia de OR, quién puede usarla y las restricciones de seguridad activas."
      />

      <Tabs defaultValue="ai">
        <TabsList className="bg-muted">
          <TabsTrigger value="ai">Proveedor de IA</TabsTrigger>
          <TabsTrigger value="safety">Seguridad</TabsTrigger>
          <TabsTrigger value="limits">Límites de uso</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="disclaimer">Disclaimer</TabsTrigger>
          <TabsTrigger value="data">Retención de datos</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4">
          <AIProvider />
        </TabsContent>
        <TabsContent value="safety" className="mt-4">
          <SafetySettings />
        </TabsContent>
        <TabsContent value="limits" className="mt-4">
          <UsageLimits />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesPanel />
        </TabsContent>
        <TabsContent value="disclaimer" className="mt-4">
          <DisclaimerPanel />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataRetention />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Card className="border-border bg-surface p-6 shadow-[var(--shadow-card)] space-y-5">
      <div>
        <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AIProvider() {
  const getFn = useServerFn(getPlatformSettingsFn);
  const saveFn = useServerFn(savePlatformSettingsFn);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform-settings"], queryFn: () => getFn() });

  const [provider, setProvider] = useState("openai");
  const [chatModel, setChatModel] = useState("openai/gpt-4.1-mini");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (q.data && !hydrated) {
      const s = q.data;
      setProvider(s.ai_provider ?? "openai");
      setChatModel(s.chat_model ?? "openai/gpt-4.1-mini");
      setTemperature(s.temperature ?? 0.2);
      setMaxTokens(s.max_tokens ?? 1024);
      setHydrated(true);
    }
  }, [q.data, hydrated]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ai_provider: provider,
          chat_model: chatModel,
          temperature,
          max_tokens: maxTokens,
        },
      }),
    onSuccess: () => {
      toast.success(tr("toast.settings.provider"));
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Proveedor de IA"
      description="Configuración de modelos y embeddings para la capa de IA de OR. El modelo de chat se aplica en las respuestas de IA."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Proveedor">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="lovable">Lovable AI Gateway</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Estado del proveedor">
          <Input value="Conectado · producción" readOnly />
        </F>
        <F label="Modelo de chat">
          <Input value={chatModel} onChange={(e) => setChatModel(e.target.value)} />
        </F>
        <F label="Modelo de embeddings">
          <Input value="text-embedding-3-small" readOnly />
        </F>
        <F label="Temperatura">
          <Input
            type="number"
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </F>
        <F label="Tokens máximos">
          <Input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
        </F>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Section>
  );
}

function SafetySettings() {
  const toggles = [
    { id: "disclaimer", label: "Requerir disclaimer educativo", default: true },
    { id: "diagnosis", label: "Bloquear diagnóstico definitivo", default: true },
    { id: "treatment", label: "Bloquear recomendación de tratamiento", default: true },
    { id: "image", label: "Bloquear interpretación de imágenes", default: true },
    { id: "urgent", label: "Mostrar advertencia de atención urgente", default: true },
    { id: "anon", label: "Requerir confirmación de anonimización en casos", default: true },
  ];
  return (
    <Section
      title="Guardarraíles de seguridad"
      description="Restricciones obligatorias aplicadas a cada respuesta de la IA."
    >
      <div className="space-y-3">
        {toggles.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <p className="text-sm text-foreground">{t.label}</p>
            <Switch defaultChecked={t.default} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => toast.success(tr("toast.settings.security"))}>Guardar</Button>
      </div>
    </Section>
  );
}

function UsageLimits() {
  const getFn = useServerFn(getPlatformSettingsFn);
  const saveFn = useServerFn(savePlatformSettingsFn);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform-settings"], queryFn: () => getFn() });

  const [daily, setDaily] = useState(100);
  const [free, setFree] = useState(20);
  const [pro, setPro] = useState(250);
  const [expert, setExpert] = useState(1000);
  const [cost, setCost] = useState(2500);
  const [alert, setAlert] = useState(75);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (q.data && !hydrated) {
      const s = q.data;
      setDaily(s.daily_query_limit ?? 100);
      setFree(s.monthly_free ?? 20);
      setPro(s.monthly_pro ?? 250);
      setExpert(s.monthly_expert ?? 1000);
      setCost(s.monthly_cost_usd ?? 2500);
      setAlert(s.alert_threshold_pct ?? 75);
      setHydrated(true);
    }
  }, [q.data, hydrated]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          daily_query_limit: daily,
          monthly_free: free,
          monthly_pro: pro,
          monthly_expert: expert,
          monthly_cost_usd: cost,
          alert_threshold_pct: alert,
        },
      }),
    onSuccess: () => {
      toast.success(tr("toast.settings.limits"));
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Límites de uso"
      description="Cuota diaria por usuario (aplicada en las respuestas de IA), consultas mensuales por plan y umbrales de alerta."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Límite diario por usuario · consultas de IA (0 = sin límite)">
          <Input
            type="number"
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
        </F>
        <F label="Consultas mensuales · plan Free">
          <Input type="number" value={free} onChange={(e) => setFree(Number(e.target.value))} />
        </F>
        <F label="Consultas mensuales · plan Pro">
          <Input type="number" value={pro} onChange={(e) => setPro(Number(e.target.value))} />
        </F>
        <F label="Consultas mensuales · plan Expert">
          <Input
            type="number"
            value={expert}
            onChange={(e) => setExpert(Number(e.target.value))}
          />
        </F>
        <F label="Límite mensual de coste admin (USD)">
          <Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </F>
        <F label="Umbral de alerta (%)">
          <Input type="number" value={alert} onChange={(e) => setAlert(Number(e.target.value))} />
        </F>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Section>
  );
}

function RolesPanel() {
  return (
    <Section
      title="Roles y permisos"
      description="Define qué puede ver y hacer cada rol en la plataforma."
    >
      <div className="grid gap-2">
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <div
            key={r}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{ROLE_LABELS[r]}</p>
              <p className="text-xs text-muted-foreground">
                {r === "admin" &&
                  "Acceso total, incluyendo configuración, base de conocimiento y analítica."}
                {r === "medical_editor" &&
                  "Revisión editorial, curación de la base de conocimiento y asignación de KOL."}
                {r === "kol" && "Revisar y validar respuestas y protocolos de la IA."}
                {r === "verified_doctor" && "Usar IA Clínica, Tutor Academy y Análisis de casos."}
                {r === "industry_user" &&
                  "Solo analítica agregada — sin datos individuales del médico ni del paciente."}
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        ))}
      </div>
    </Section>
  );
}

function DisclaimerPanel() {
  const [text, setText] = useState(EDUCATIONAL_DISCLAIMER);
  return (
    <Section
      title="Gestión del disclaimer"
      description="El disclaimer educativo que se muestra con cada respuesta de la IA."
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[120px]" />
      <div className="flex justify-end">
        <Button onClick={() => toast.success(tr("toast.settings.disclaimer"))}>Guardar</Button>
      </div>
    </Section>
  );
}

function DataRetention() {
  return (
    <Section
      title="Retención de datos"
      description="Tiempo durante el que se almacenan interacciones, feedback y eventos de seguridad."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Registros de interacción de IA (días)">
          <Input type="number" defaultValue={180} />
        </F>
        <F label="Feedback (días)">
          <Input type="number" defaultValue={365} />
        </F>
        <F label="Eventos de seguridad (días)">
          <Input type="number" defaultValue={730} />
        </F>
        <F label="Anonimizar tras (días)">
          <Input type="number" defaultValue={30} />
        </F>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => toast.success(tr("toast.settings.retention"))}>Guardar</Button>
      </div>
      <EraseMyData />
    </Section>
  );
}

function EraseMyData() {
  const eraseFn = useServerFn(deleteMyAIData);
  const mutation = useMutation({
    mutationFn: () => eraseFn(),
    onSuccess: (r) =>
      toast.success(
        `Datos eliminados: ${r.interactions_deleted} interacciones, ${r.feedback_deleted} feedback, ${r.safety_events_deleted} eventos de seguridad.`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-foreground">Derecho de supresión (RGPD)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Elimina permanentemente todas tus interacciones de IA, feedback y eventos de seguridad
        asociados a tu cuenta. Esta acción no se puede deshacer.
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => {
            if (
              window.confirm(
                "¿Eliminar permanentemente todos tus datos de IA? Esta acción no se puede deshacer.",
              )
            ) {
              mutation.mutate();
            }
          }}
        >
          {mutation.isPending ? "Eliminando…" : "Eliminar mis datos de IA"}
        </Button>
      </div>
    </div>
  );
}
