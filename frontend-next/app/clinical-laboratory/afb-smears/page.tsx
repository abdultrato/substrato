"use client";

import { TestTubes } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";

type AfbSmear = {
  id: number; custom_id: string; stain: string; grade: string;
  afb_count: string; serial_number: string; performed_at: string | null;
};

const STAIN_LABELS: Record<string, string> = { ZN: "Ziehl-Neelsen", AURAMINA: "Auramina" };
const GRADE_TONE: Record<string, "emerald" | "amber" | "red"> = {
  NEGATIVO: "emerald", RARO: "amber", "1+": "red", "2+": "red", "3+": "red",
};

export default function LabAfbSmearsPage() {
  return (
    <ResourceCardList<AfbSmear>
      endpoint="/clinical_laboratory/afb_smear/"
      basePath="/clinical-laboratory/afb-smears"
      title="Baciloscopias (BAAR)"
      icon={TestTubes}
      countNoun={["baciloscopia", "baciloscopias"]}
      newLabel="Nova baciloscopia"
      searchPlaceholder="Pesquisar por contagem, código ou notas…"
      filters={[
        { key: "grade", allLabel: "Todos os graus", options: ["NEGATIVO", "RARO", "1+", "2+", "3+"].map((v) => ({ value: v, label: v === "NEGATIVO" ? "Negativo" : v === "RARO" ? "Raro" : v })) },
        { key: "stain", allLabel: "Todas as colorações", options: Object.entries(STAIN_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ]}
      renderCard={(s) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle code={s.custom_id} name={s.serial_number ? `Lâmina ${s.serial_number}` : "Baciloscopia"} />
            <StatusPill tone={GRADE_TONE[s.grade] ?? "gray"}>{s.grade === "NEGATIVO" ? "Negativo" : s.grade === "RARO" ? "Raro" : s.grade}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.stain && <Pill tone="violet">{STAIN_LABELS[s.stain] ?? s.stain}</Pill>}
            {s.afb_count && <Pill tone="gray">{s.afb_count}</Pill>}
          </div>
          <CardFooter left={<>{s.performed_at ? `Realizada ${fmtDate(s.performed_at)}` : "—"}</>} />
        </>
      )}
    />
  );
}
