"use client";

import { Microscope } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";

type Culture = {
  id: number; custom_id: string; culture_type: string; specimen: string; status: string;
  read_at: string | null; incubation_started_at: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  AEROBIA: "Aeróbia", ANAEROBIA: "Anaeróbia", FUNGICA: "Fúngica", MICOBACTERIA: "Micobactéria",
  HEMOCULTURA: "Hemocultura", UROCULTURA: "Urocultura", OUTRA: "Outra",
};
const STATUS_LABELS: Record<string, string> = {
  MONTADA: "Montada", INCUBACAO: "Em incubação", CRESCIMENTO: "Com crescimento",
  SEM_CRESCIMENTO: "Sem crescimento", CONCLUIDA: "Concluída",
};
const STATUS_TONE: Record<string, "gray" | "blue" | "amber" | "emerald" | "violet"> = {
  MONTADA: "gray", INCUBACAO: "blue", CRESCIMENTO: "amber", SEM_CRESCIMENTO: "emerald", CONCLUIDA: "violet",
};

export default function LabCulturesPage() {
  return (
    <ResourceCardList<Culture>
      endpoint="/clinical_laboratory/culture/"
      basePath="/clinical-laboratory/cultures"
      title="Culturas"
      icon={Microscope}
      countNoun={["cultura", "culturas"]}
      newLabel="Nova cultura"
      searchPlaceholder="Pesquisar por código, espécime ou notas…"
      filters={[
        { key: "status", allLabel: "Todos os estados", options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
        { key: "culture_type", allLabel: "Todos os tipos", options: Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ]}
      renderCard={(c) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle name={c.custom_id} />
            <StatusPill tone={STATUS_TONE[c.status] ?? "gray"}>{STATUS_LABELS[c.status] ?? c.status}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="violet">{TYPE_LABELS[c.culture_type] ?? c.culture_type}</Pill>
            {c.specimen && <Pill tone="gray">{c.specimen}</Pill>}
          </div>
          <CardFooter left={<>{c.read_at ? `Lida ${fmtDate(c.read_at)}` : c.incubation_started_at ? `Incubação ${fmtDate(c.incubation_started_at)}` : "—"}</>} />
        </>
      )}
    />
  );
}
