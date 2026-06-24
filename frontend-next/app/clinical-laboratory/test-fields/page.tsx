"use client";

import { FlaskConical } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill, StatusPill } from "@/components/clinical-laboratory/ResourceCardList";

type LabTestField = {
  id: number; custom_id: string; code: string; name: string;
  unit: string; result_type: string; reference_range: string; active: boolean;
  test_name?: string;
};

const TYPE_LABELS: Record<string, string> = { numero: "Número", texto: "Texto", texto_choice: "Escolha" };

export default function LabTestFieldsPage() {
  return (
    <ResourceCardList<LabTestField>
      endpoint="/clinical_laboratory/test_field/"
      basePath="/clinical-laboratory/test-fields"
      title="Campos de exame"
      icon={FlaskConical}
      countNoun={["campo", "campos"]}
      searchPlaceholder="Pesquisar por nome, código ou unidade…"
      filters={[
        { key: "active", allLabel: "Todos os estados", options: [
          { value: "true", label: "Ativos" }, { value: "false", label: "Inativos" },
        ] },
      ]}
      getActive={(f) => f.active}
      renderCard={(f) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle code={f.code || f.custom_id} name={f.name} />
            <StatusPill tone={f.active ? "emerald" : "red"}>{f.active ? "Ativo" : "Inativo"}</StatusPill>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.test_name && <Pill tone="violet">{f.test_name}</Pill>}
            {f.unit && <Pill tone="gray">{f.unit}</Pill>}
            <Pill tone="indigo">{TYPE_LABELS[f.result_type] ?? f.result_type}</Pill>
          </div>
          {f.reference_range && <CardFooter left={<>Ref. {f.reference_range}</>} />}
        </>
      )}
    />
  );
}
