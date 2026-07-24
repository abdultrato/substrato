"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Contrast, ListChecks, Loader2, MapPin, ScanLine } from "lucide-react";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { apiFetch } from "@/lib/api";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { GROUPS } from "@/lib/rbac";
import type { ImagingProtocol } from "./page";

const ENDPOINT = "/radiology/protocol/";
const GLASS = "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";
const COMPACT = ["name", "code", "modality", "body_region", "contrast_required", "typical_duration_minutes"];

function Summary({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return <div className="min-w-[125px] flex-1 rounded-md border border-border/60 bg-background/45 px-2 py-1"><div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Icon size={11} />{label}</div><div className="truncate text-sm font-bold">{value || "—"}</div></div>;
}

export default function ProtocolFormPage({ id }: { id?: string }) {
  useAuthGuard();
  const router = useRouter();
  const editing = Boolean(id);
  const [item, setItem] = useState<ImagingProtocol | null>(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const config = useMemo(() => {
    const base = getResourceFormConfig("radiology", "protocol", ENDPOINT) || {};
    return {
      ...base,
      ordenarCampos: ["name", "code", "modality", "body_region", "contrast_required", "typical_duration_minutes", "preparation", "acquisition_instructions", "default_report_template", "notes"],
      widgets: { ...base.widgets, preparation: "textarea" as const, acquisition_instructions: "textarea" as const, default_report_template: "textarea" as const, notes: "textarea" as const },
      etapasEmCartoes: true,
      etapas: [
        { titulo: "Identificação", descricao: "Nome, código e classificação do protocolo.", campos: ["name", "code", "modality", "body_region"] },
        { titulo: "Parâmetros", descricao: "Contraste e duração prevista.", campos: ["contrast_required", "typical_duration_minutes"] },
        { titulo: "Preparação e aquisição", descricao: "Orientações antes e durante o exame.", campos: ["preparation", "acquisition_instructions"] },
        { titulo: "Laudo e observações", descricao: "Modelo clínico e notas complementares.", campos: ["default_report_template", "notes"] },
      ],
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    apiFetch<ImagingProtocol>(`${ENDPOINT}${id}/`, { clientCache: false })
      .then((data) => { if (mounted) setItem(data); })
      .catch((reason) => { if (mounted) setError(reason?.message || "Falha ao carregar protocolo."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
    <div className="w-auto space-y-1.5 px-0.5">
      <header className={`${GLASS} relative overflow-hidden`}>
        <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
        <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300"><ListChecks size={18} /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">Protocolo de imagem</p><h1 className="text-base font-bold">{editing ? `Editar ${item?.name || `protocolo #${id}`}` : "Novo protocolo"}</h1></div></div>
            <Link href={editing ? `/radiology/protocols/${id}` : "/radiology/protocols"} className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground"><ArrowLeft size={13} />Voltar</Link>
          </div>
          {item ? <div className="flex flex-nowrap gap-1 overflow-x-auto"><Summary icon={ScanLine} label="Modalidade" value={item.modality} /><Summary icon={MapPin} label="Região" value={item.body_region} /><Summary icon={Clock3} label="Duração" value={`${item.typical_duration_minutes || 0} min`} /><Summary icon={Contrast} label="Contraste" value={item.contrast_required ? "Sim" : "Não"} /></div> : null}
        </div>
      </header>
      {loading ? <div className={`${GLASS} flex min-h-52 items-center justify-center gap-2 text-sm text-muted-foreground`}><Loader2 size={18} className="animate-spin" />A carregar protocolo...</div> : error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : <AutoForm endpoint={editing ? `${ENDPOINT}${id}/` : ENDPOINT} method={editing ? "put" : "post"} initialValues={item || {}} submitLabel={editing ? "Guardar alterações" : "Criar protocolo"} config={config} compactFields={COMPACT} presentation="radiology" onSuccess={(data) => router.push(`/radiology/protocols/${data?.id || id || ""}`)} />}
    </div>
  </AppLayout>;
}
