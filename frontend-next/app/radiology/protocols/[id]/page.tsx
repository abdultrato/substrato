"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, Contrast, Edit3, FileText, ListChecks, Loader2, MapPin, ScanLine } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import type { ImagingProtocol } from "../page";

const GLASS = "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";
const MODALITIES: Record<string, string> = { XRAY: "Raio-X", ULTRASOUND: "Ecografia", CT: "Tomografia", MRI: "Ressonância magnética", MAMMOGRAPHY: "Mamografia", FLUOROSCOPY: "Fluoroscopia", DENSITOMETRY: "Densitometria", OTHER: "Outra" };
const REGIONS: Record<string, string> = { HEAD: "Cabeça", NECK: "Pescoço", CHEST: "Tórax", ABDOMEN: "Abdómen", PELVIS: "Pelve", SPINE: "Coluna", UPPER_LIMB: "Membro superior", LOWER_LIMB: "Membro inferior", BREAST: "Mama", VASCULAR: "Vascular", WHOLE_BODY: "Corpo inteiro", OTHER: "Outra" };

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return <div className="min-w-[125px] flex-1 rounded-md border border-border/60 bg-background/45 px-2 py-1"><div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Icon size={11} />{label}</div><div className="truncate text-sm font-bold">{value || "—"}</div></div>;
}
function Card({ icon: Icon, title, accent, children }: { icon: React.ElementType; title: string; accent: string; children: React.ReactNode }) {
  return <section className={`${GLASS} relative overflow-hidden`}><span className={`absolute inset-y-0 left-0 w-1 ${accent}`} /><div className="space-y-2 px-3 py-2 pl-4"><div className="flex items-center gap-2 border-b border-border/50 pb-1.5"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10"><Icon size={14} /></span><h2 className="text-sm font-bold">{title}</h2></div>{children}</div></section>;
}
function Text({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-md border border-border/60 bg-background/45 px-2.5 py-2"><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="whitespace-pre-wrap text-xs leading-relaxed">{value || "Não informado."}</p></div>;
}

export default function RadiologyProtocolsDetailPage() {
  useAuthGuard();
  const id = String((useParams() as { id?: string })?.id || "");
  const refresh = useSafeDataRefreshSignal();
  const [item, setItem] = useState<ImagingProtocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    apiFetch<ImagingProtocol>(`/radiology/protocol/${id}/`, { clientCache: refresh === 0 }).then((data) => { if (mounted) setItem(data); }).catch((reason) => { if (mounted) setError(reason?.message || "Falha ao carregar protocolo."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id, refresh]);

  return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth><div className="w-auto space-y-1.5 px-0.5">
    <header className={`${GLASS} relative overflow-hidden`}><span className="absolute inset-y-0 left-0 w-1 bg-amber-500" /><div className="space-y-1.5 px-2.5 py-1.5 pl-4">
      <div className="flex flex-wrap items-center justify-between gap-1.5"><div className="flex min-w-0 items-center gap-1.5"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300"><ListChecks size={18} /></span><div><h1 className="text-base font-bold">{loading ? "Protocolo..." : item?.name || item?.code || `Protocolo #${id}`}</h1><p className="text-[10px] text-muted-foreground">{item?.code || item?.custom_id || `ID ${id}`}</p></div></div><div className="flex gap-1"><Link href="/radiology/protocols" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground"><ArrowLeft size={13} />Voltar</Link><Link href={`/radiology/protocols/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/15 px-2 text-xs font-semibold text-amber-700 dark:text-amber-200"><Edit3 size={13} />Editar</Link></div></div>
      {item ? <div className="flex flex-nowrap gap-1 overflow-x-auto"><Metric icon={ScanLine} label="Modalidade" value={MODALITIES[item.modality || ""] || item.modality} /><Metric icon={MapPin} label="Região" value={REGIONS[item.body_region || ""] || item.body_region} /><Metric icon={Clock3} label="Duração" value={`${item.typical_duration_minutes || 0} min`} /><Metric icon={Contrast} label="Contraste" value={item.contrast_required ? "Sim" : "Não"} /></div> : null}
    </div></header>
    {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
    {loading ? <div className={`${GLASS} flex h-40 items-center justify-center`}><Loader2 size={20} className="animate-spin text-muted-foreground" /></div> : item ? <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
      <Card icon={ScanLine} title="Identificação e classificação" accent="bg-amber-500"><div className="grid grid-cols-1 gap-1 sm:grid-cols-2"><Metric icon={ListChecks} label="Nome" value={item.name} /><Metric icon={FileText} label="Código" value={item.code} /><Metric icon={ScanLine} label="Modalidade" value={MODALITIES[item.modality || ""] || item.modality} /><Metric icon={MapPin} label="Região anatómica" value={REGIONS[item.body_region || ""] || item.body_region} /></div></Card>
      <Card icon={Clock3} title="Parâmetros operacionais" accent="bg-sky-500"><div className="grid grid-cols-1 gap-1 sm:grid-cols-2"><Metric icon={Contrast} label="Requer contraste" value={item.contrast_required ? "Sim" : "Não"} /><Metric icon={Clock3} label="Duração típica" value={`${item.typical_duration_minutes || 0} minutos`} /></div></Card>
      <Card icon={ListChecks} title="Preparação e aquisição" accent="bg-emerald-500"><div className="space-y-1"><Text label="Preparação" value={item.preparation} /><Text label="Instruções de aquisição" value={item.acquisition_instructions} /></div></Card>
      <Card icon={FileText} title="Laudo e observações" accent="bg-violet-500"><div className="space-y-1"><Text label="Modelo padrão de laudo" value={item.default_report_template} /><Text label="Observações" value={item.notes} /></div></Card>
    </div> : <div className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>Protocolo não encontrado.</div>}
  </div></AppLayout>;
}
