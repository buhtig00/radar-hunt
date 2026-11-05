import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { RoleBootstrapCard } from "@/components/role-bootstrap-card";
import { upsertPathology, upsertMedication, listRecentContent } from "@/lib/content-crud.functions";
import { Loader2, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/content-editor")({
  head: () => ({
    meta: [
      { title: "Editor de contenido · Ophthalmology Radar" },
      {
        name: "description",
        content: "Crea y edita patologías y fármacos del corpus clínico oftalmológico.",
      },
    ],
  }),
  component: ContentEditorPage,
});

const SUBSPECIALTIES = [
  "retina",
  "glaucoma",
  "cornea",
  "ocular_surface",
  "cataract",
  "refractive",
  "uveitis",
  "oculoplastics",
  "neuro_ophthalmology",
  "pediatric_ophthalmology",
  "strabismus",
  "contactology",
  "low_vision",
  "ocular_oncology",
  "ocular_trauma",
  "emergency_ophthalmology",
  "general_ophthalmology",
];
const MED_CLASSES = [
  "anti_vegf",
  "corticosteroid",
  "antibiotic",
  "antiviral",
  "antifungal",
  "anti_inflammatory_nsaid",
  "immunomodulator",
  "immunosuppressant",
  "glaucoma_prostaglandin",
  "glaucoma_beta_blocker",
  "glaucoma_alpha_agonist",
  "glaucoma_carbonic_anhydrase_inhibitor",
  "glaucoma_rho_kinase_inhibitor",
  "glaucoma_miotic",
  "mydriatic_cycloplegic",
  "lubricant_artificial_tear",
  "osmotic_agent",
  "diagnostic_dye",
  "local_anesthetic",
  "anti_allergic",
  "anti_fibrotic",
  "other",
];
const MED_ROUTES = [
  "topical",
  "intravitreal",
  "subconjunctival",
  "subtenon",
  "intracameral",
  "periocular",
  "oral",
  "intravenous",
  "implant",
  "other",
];

function ContentEditorPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Editor"
        title="Editor de contenido"
        description="Crea borradores de patologías y fármacos. Después se aprueban en Revisión editorial."
      />
      <RoleBootstrapCard />
      <Tabs defaultValue="pathology">
        <TabsList>
          <TabsTrigger value="pathology">Patología</TabsTrigger>
          <TabsTrigger value="medication">Fármaco</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
        </TabsList>
        <TabsContent value="pathology" className="mt-4">
          <PathologyForm />
        </TabsContent>
        <TabsContent value="medication" className="mt-4">
          <MedicationForm />
        </TabsContent>
        <TabsContent value="recent" className="mt-4">
          <RecentList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PathologyForm() {
  const fn = useServerFn(upsertPathology);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name_es: "",
    name_en: "",
    subspecialty: "retina",
    definition_es: "",
    clinical_features_es: "",
    treatment_overview_es: "",
    red_flags_es: "",
  });
  const mut = useMutation({
    mutationFn: (v: any) => fn({ data: v }),
    onSuccess: () => {
      toast.success("Patología guardada como borrador");
      qc.invalidateQueries({ queryKey: ["recent-content"] });
      qc.invalidateQueries({ queryKey: ["editorial-pending"] });
      setForm({
        name_es: "",
        name_en: "",
        subspecialty: "retina",
        definition_es: "",
        clinical_features_es: "",
        treatment_overview_es: "",
        red_flags_es: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="border-border bg-surface p-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nombre (ES)">
          <Input value={form.name_es} onChange={(e) => set("name_es", e.target.value)} />
        </Field>
        <Field label="Nombre (EN)">
          <Input value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
        </Field>
        <Field label="Subespecialidad">
          <Select value={form.subspecialty} onValueChange={(v) => set("subspecialty", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Definición (ES)">
        <Textarea
          rows={3}
          value={form.definition_es}
          onChange={(e) => set("definition_es", e.target.value)}
        />
      </Field>
      <Field label="Características clínicas (ES)">
        <Textarea
          rows={4}
          value={form.clinical_features_es}
          onChange={(e) => set("clinical_features_es", e.target.value)}
        />
      </Field>
      <Field label="Tratamiento (ES)">
        <Textarea
          rows={4}
          value={form.treatment_overview_es}
          onChange={(e) => set("treatment_overview_es", e.target.value)}
        />
      </Field>
      <Field label="Red flags (ES)">
        <Textarea
          rows={2}
          value={form.red_flags_es}
          onChange={(e) => set("red_flags_es", e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button
          onClick={() => mut.mutate(form)}
          disabled={mut.isPending || !form.name_es || !form.name_en}
          className="gap-2"
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Crear borrador
        </Button>
      </div>
    </Card>
  );
}

function MedicationForm() {
  const fn = useServerFn(upsertMedication);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    generic_name_en: "",
    generic_name_es: "",
    brand_names_csv: "",
    medication_class: "anti_vegf",
    route: "intravitreal",
    mechanism_es: "",
    common_uses_es: "",
    warnings_es: "",
    adverse_effects_es: "",
    is_prescription: true,
  });
  const mut = useMutation({
    mutationFn: (v: any) => fn({ data: v }),
    onSuccess: () => {
      toast.success("Fármaco guardado como borrador");
      qc.invalidateQueries({ queryKey: ["recent-content"] });
      qc.invalidateQueries({ queryKey: ["editorial-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const { brand_names_csv, ...rest } = form;
    mut.mutate({
      ...rest,
      brand_names: brand_names_csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <Card className="border-border bg-surface p-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nombre genérico (EN)">
          <Input
            value={form.generic_name_en}
            onChange={(e) => set("generic_name_en", e.target.value)}
          />
        </Field>
        <Field label="Nombre genérico (ES)">
          <Input
            value={form.generic_name_es}
            onChange={(e) => set("generic_name_es", e.target.value)}
          />
        </Field>
        <Field label="Marcas (separadas por coma)">
          <Input
            value={form.brand_names_csv}
            onChange={(e) => set("brand_names_csv", e.target.value)}
          />
        </Field>
        <Field label="Clase">
          <Select value={form.medication_class} onValueChange={(v) => set("medication_class", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MED_CLASSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vía">
          <Select value={form.route} onValueChange={(v) => set("route", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MED_ROUTES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Mecanismo (ES)">
        <Textarea
          rows={3}
          value={form.mechanism_es}
          onChange={(e) => set("mechanism_es", e.target.value)}
        />
      </Field>
      <Field label="Indicaciones habituales (ES)">
        <Textarea
          rows={3}
          value={form.common_uses_es}
          onChange={(e) => set("common_uses_es", e.target.value)}
        />
      </Field>
      <Field label="Advertencias (ES)">
        <Textarea
          rows={3}
          value={form.warnings_es}
          onChange={(e) => set("warnings_es", e.target.value)}
        />
      </Field>
      <Field label="Efectos adversos (ES)">
        <Textarea
          rows={3}
          value={form.adverse_effects_es}
          onChange={(e) => set("adverse_effects_es", e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={mut.isPending || !form.generic_name_en}
          className="gap-2"
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Crear borrador
        </Button>
      </div>
    </Card>
  );
}

function RecentList() {
  const fn = useServerFn(listRecentContent);
  const q = useQuery({ queryKey: ["recent-content"], queryFn: () => fn() });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  const d = q.data;
  if (!d) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border bg-surface p-5">
        <p className="font-medium mb-2">Patologías recientes</p>
        <ul className="divide-y divide-border text-sm">
          {d.pathologies.map((p: any) => (
            <li key={p.id} className="py-2 flex justify-between gap-2">
              <span className="truncate">{p.name_es}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {p.subspecialty} · {p.status}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border-border bg-surface p-5">
        <p className="font-medium mb-2">Fármacos recientes</p>
        <ul className="divide-y divide-border text-sm">
          {d.medications.map((m: any) => (
            <li key={m.id} className="py-2 flex justify-between gap-2">
              <span className="truncate">{m.generic_name_es ?? m.generic_name_en}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {m.medication_class} · {m.status}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
