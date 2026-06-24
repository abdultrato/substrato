"use client";

import { Dna } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";

type MolecularResult = {
  id: number; custom_id: string; assay: string; detection: string; rif_resistance: string;
  instrument: string; performed_at: string | null;
};

const ASSAY_LABELS: Record<string, string> = {
  GENEXPERT_MTB_RIF: "GeneXpert MTB/RIF", TB_PCR: "TB PCR", CV_HIV: "Carga viral HIV",
  CV_HEPATITE: "Carga viral hepatite", HPV_DNA: "HPV DNA", COVID_PCR: "COVID PCR", PCR: "PCR", OUTRO: "Outro",
};
const DETECTION_LABELS: Record<string, string> = {
  DETETADO: "Detetado", NAO_DETETADO: "Não detetado", INDETERMINADO: "Indeterminado", INVALIDO: "Inválido",
};
const DETECTION_TONE: Record<string, "red" | "emerald" | "gray"> = {
  DETETADO: "red", NAO_DETETADO: "emerald", INDETERMINADO: "gray", INVALIDO: "gray",
};
const RIF_LABELS: Record<string, string> = {
  SENSIVEL: "RIF sensível", RESISTENTE: "RIF resistente", INDETERMINADO: "RIF indeterminado",
};

export default function LabMolecularPage() {
  return (
    <ResourceCardList<MolecularResult>
      endpoint="/clinical_laboratory/molecular_result/"
      basePath="/clinical-laboratory/molecular"
      title="Biologia molecular"
      icon={Dna}
      countNoun={["resultado", "resultados"]}
      newLabel="Novo resultado"
      searchPlaceholder="Pesquisar por instrumento, código ou notas…"
      filters={[
        { key: "assay", allLabel: "Todos os ensaios", options: Object.entries(ASSAY_LABELS).map(([v, l]) => ({ value: v, label: l })) },
        { key: "detection", allLabel: "Toda a deteção", options: Object.entries(DETECTION_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ]}
      renderCard={(m) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle code={m.custom_id} name={ASSAY_LABELS[m.assay] ?? m.assay} />
            <StatusPill tone={DETECTION_TONE[m.detection] ?? "gray"}>{DETECTION_LABELS[m.detection] ?? m.detection}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {m.rif_resistance && m.rif_resistance !== "NA" && (
              <Pill tone={m.rif_resistance === "RESISTENTE" ? "red" : "violet"}>{RIF_LABELS[m.rif_resistance] ?? m.rif_resistance}</Pill>
            )}
            {m.instrument && <Pill tone="gray">{m.instrument}</Pill>}
          </div>
          <CardFooter left={<>{m.performed_at ? `Realizado ${fmtDate(m.performed_at)}` : "—"}</>} />
        </>
      )}
    />
  );
}
