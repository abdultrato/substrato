"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Contrast, FilePlus2, ListChecks, Loader2, MapPin, ScanLine, Search, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

export type ImagingProtocol = {
  id: number;
  custom_id?: string;
  name?: string;
  code?: string;
  modality?: string;
  body_region?: string;
  contrast_required?: boolean;
  typical_duration_minutes?: number;
  preparation?: string;
  acquisition_instructions?: string;
  default_report_template?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

const GLASS = "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";
const MODALITIES: Record<string, string> = {
  XRAY: "Raio-X", ULTRASOUND: "Ecografia", CT: "Tomografia", MRI: "Ressonância",
  MAMMOGRAPHY: "Mamografia", FLUOROSCOPY: "Fluoroscopia", DENSITOMETRY: "Densitometria", OTHER: "Outra",
};
const REGIONS: Record<string, string> = {
  HEAD: "Cabeça", NECK: "Pescoço", CHEST: "Tórax", ABDOMEN: "Abdómen", PELVIS: "Pelve",
  SPINE: "Coluna", UPPER_LIMB: "Membro superior", LOWER_LIMB: "Membro inferior", BREAST: "Mama",
  VASCULAR: "Vascular", WHOLE_BODY: "Corpo inteiro", OTHER: "Outra",
};

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return <div className="min-w-0 flex-1 rounded-md border border-border/60 bg-background/45 px-2 py-1">
    <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Icon size={11} />{label}</div>
    <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
  </div>;
}

function ProtocolCard({ item }: { item: ImagingProtocol }) {
  return <Link href={`/radiology/protocols/${item.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}>
    <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
    <div className="space-y-2 px-3 py-2 pl-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300"><ListChecks size={17} /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">{item.name || item.code || `Protocolo #${item.id}`}</p>
            <p className="truncate text-[10px] text-muted-foreground">{item.code || item.custom_id || `ID ${item.id}`}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">{MODALITIES[item.modality || ""] || item.modality || "Outra"}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <Metric icon={MapPin} label="Região" value={REGIONS[item.body_region || ""] || item.body_region || "—"} />
        <Metric icon={Clock3} label="Duração" value={`${item.typical_duration_minutes || 0} min`} />
        <Metric icon={Contrast} label="Contraste" value={item.contrast_required ? "Sim" : "Não"} />
      </div>
      <div className="border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
        <p className="line-clamp-2">{item.preparation || "Sem preparação específica."}</p>
      </div>
    </div>
  </Link>;
}

export default function RadiologyProtocolsListPage() {
  useAuthGuard();
  const refresh = useSafeDataRefreshSignal();
  const [items, setItems] = useState<ImagingProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState("ALL");
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let mounted = true;
    apiFetchList<ImagingProtocol>("/radiology/protocol/", { page: 1, pageSize: 500, clientPaginate: true, clientCache: refresh === 0 })
      .then((response) => { if (mounted) setItems(response.items || []); })
      .catch((reason) => { if (mounted) setError(reason?.message || "Falha ao carregar protocolos."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (modality !== "ALL" && item.modality !== modality) return false;
      return !term || [item.name, item.code, item.custom_id, item.preparation, REGIONS[item.body_region || ""]].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [items, modality, search]);
  const visible = filtered.slice(0, limit);
  const contrast = items.filter((item) => item.contrast_required).length;
  const modalities = new Set(items.map((item) => item.modality).filter(Boolean)).size;

  return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
    <div className="w-full space-y-1.5 px-0.5">
      <header className={`${GLASS} relative overflow-hidden`}>
        <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
        <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300"><ListChecks size={18} /></span>
              <div><h1 className="text-base font-bold leading-tight">Protocolos de imagem</h1><p className="text-[11px] text-muted-foreground">{loading ? "A carregar..." : `${visible.length} de ${filtered.length} protocolos`}</p></div>
            </div>
            <div className="flex gap-1">
              <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground"><ArrowLeft size={13} />Voltar</Link>
              <Link href="/radiology/protocols/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/15 px-2 text-xs font-semibold text-amber-700 dark:text-amber-200"><FilePlus2 size={13} />Novo protocolo</Link>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
            <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
              <Metric icon={ListChecks} label="Protocolos" value={items.length} /><Metric icon={ScanLine} label="Modalidades" value={modalities} /><Metric icon={Contrast} label="Com contraste" value={contrast} />
            </div>
            <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[500px]">
              <div className="relative min-w-[220px] flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />{search ? <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={12} /></button> : null}</div>
              <input type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(Math.min(500, Math.max(1, Number(e.target.value || 1))))} className="h-7 w-16 shrink-0 rounded-md border border-border bg-background/70 px-2 text-center text-xs font-semibold outline-none" aria-label="Quantidade de protocolos" />
              <select value={modality} onChange={(e) => setModality(e.target.value)} className="h-7 max-w-36 shrink-0 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold outline-none"><option value="ALL">Modalidades</option>{Object.entries(MODALITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            </div>
          </div>
        </div>
      </header>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className={`${GLASS} flex h-32 items-center justify-center`}><Loader2 className="animate-spin text-muted-foreground" size={20} /></div> : visible.length ? <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">{visible.map((item) => <ProtocolCard key={item.id} item={item} />)}</div> : <div className={`${GLASS} flex h-32 items-center justify-center text-sm text-muted-foreground`}>Nenhum protocolo encontrado.</div>}
    </div>
  </AppLayout>;
}
