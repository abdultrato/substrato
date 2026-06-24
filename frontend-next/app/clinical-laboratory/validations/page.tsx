"use client";

import { CheckCircle2 } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";

type LabValidation = {
  id: number; custom_id: string; validation_type: string; status: string; validated_at: string | null;
};

const TYPE_LABELS: Record<string, string> = { TECNICA: "Técnica", CLINICA: "Clínica" };
const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente", APROVADA: "Aprovada", REJEITADA: "Rejeitada", REPETIR: "Repetir", REVISAO: "Revisão",
};
const STATUS_TONE: Record<string, "amber" | "emerald" | "red" | "blue"> = {
  PENDENTE: "amber", APROVADA: "emerald", REJEITADA: "red", REPETIR: "amber", REVISAO: "blue",
};

export default function LabValidationsPage() {
  return (
    <ResourceCardList<LabValidation>
      endpoint="/clinical_laboratory/validation/"
      basePath="/clinical-laboratory/validations"
      title="Validações"
      icon={CheckCircle2}
      countNoun={["validação", "validações"]}
      searchPlaceholder="Pesquisar por código ou notas…"
      filters={[
        { key: "status", allLabel: "Todos os estados", options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
        { key: "validation_type", allLabel: "Todos os tipos", options: Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ]}
      renderCard={(v) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle name={v.custom_id} />
            <StatusPill tone={STATUS_TONE[v.status] ?? "gray"}>{STATUS_LABELS[v.status] ?? v.status}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="violet">{TYPE_LABELS[v.validation_type] ?? v.validation_type}</Pill>
          </div>
          <CardFooter left={<>Validada {fmtDate(v.validated_at)}</>} />
        </>
      )}
    />
  );
}
