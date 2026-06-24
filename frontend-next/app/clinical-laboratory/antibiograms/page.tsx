"use client";

import { Pill as PillIcon } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill } from "@/components/clinical-laboratory/ResourceCardList";

type Antibiogram = {
  id: number; custom_id: string; antibiotic: string; method: string; result: string;
  zone_mm: string | null; mic_value: string;
};

const METHOD_LABELS: Record<string, string> = { DISCO: "Disco", CIM: "CIM", ETEST: "E-test", AUTOMATIZADO: "Automatizado" };
const RESULT_LABELS: Record<string, string> = { SENSIVEL: "Sensível", INTERMEDIO: "Intermédio", RESISTENTE: "Resistente" };
const RESULT_TONE: Record<string, "emerald" | "amber" | "red"> = { SENSIVEL: "emerald", INTERMEDIO: "amber", RESISTENTE: "red" };

export default function LabAntibiogramsPage() {
  return (
    <ResourceCardList<Antibiogram>
      endpoint="/clinical_laboratory/antibiogram/"
      basePath="/clinical-laboratory/antibiograms"
      title="Antibiogramas"
      icon={PillIcon}
      countNoun={["antibiograma", "antibiogramas"]}
      newLabel="Novo antibiograma"
      searchPlaceholder="Pesquisar por antibiótico ou CIM…"
      filters={[
        { key: "result", allLabel: "Todos os resultados", options: Object.entries(RESULT_LABELS).map(([v, l]) => ({ value: v, label: l })) },
        { key: "method", allLabel: "Todos os métodos", options: Object.entries(METHOD_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ]}
      renderCard={(a) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle code={a.custom_id} name={a.antibiotic || "—"} />
            <StatusPill tone={RESULT_TONE[a.result] ?? "gray"}>{RESULT_LABELS[a.result] ?? a.result}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="violet">{METHOD_LABELS[a.method] ?? a.method}</Pill>
          </div>
          <CardFooter left={<>{[a.zone_mm ? `Halo ${a.zone_mm} mm` : "", a.mic_value ? `CIM ${a.mic_value}` : ""].filter(Boolean).join(" · ") || "—"}</>} />
        </>
      )}
    />
  );
}
