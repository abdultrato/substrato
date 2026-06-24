"use client";

import { Microscope } from "lucide-react";
import ResourceCardList, { CardTitle, StatusPill } from "@/components/clinical-laboratory/ResourceCardList";

type LabSector = { id: number; custom_id: string; code: string; name: string; active: boolean };

export default function LabSectorsPage() {
  return (
    <ResourceCardList<LabSector>
      endpoint="/clinical_laboratory/sector/"
      basePath="/clinical-laboratory/sectors"
      title="Sectores"
      icon={Microscope}
      countNoun={["sector", "sectores"]}
      newLabel="Novo sector"
      searchPlaceholder="Pesquisar por nome ou código…"
      filters={[
        { key: "active", allLabel: "Todos os estados", options: [
          { value: "true", label: "Ativos" }, { value: "false", label: "Inativos" },
        ] },
      ]}
      getActive={(s) => s.active}
      renderCard={(s) => (
        <div className="flex items-start justify-between gap-2">
          <CardTitle code={s.code || s.custom_id} name={s.name} />
          <StatusPill tone={s.active ? "emerald" : "red"}>{s.active ? "Ativo" : "Inativo"}</StatusPill>
        </div>
      )}
    />
  );
}
