"use client";

import { Bug } from "lucide-react";
import ResourceCardList, { CardTitle, CardFooter, Pill } from "@/components/clinical-laboratory/ResourceCardList";

type Isolate = {
  id: number; custom_id: string; organism_name: string; gram_stain: string;
  quantity: string; is_significant: boolean;
};

export default function LabIsolatesPage() {
  return (
    <ResourceCardList<Isolate>
      endpoint="/clinical_laboratory/isolate/"
      basePath="/clinical-laboratory/isolates"
      title="Isolados"
      icon={Bug}
      countNoun={["isolado", "isolados"]}
      newLabel="Novo isolado"
      searchPlaceholder="Pesquisar por organismo, coloração ou código…"
      renderCard={(i) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <CardTitle code={i.custom_id} name={i.organism_name || "—"} />
            {i.is_significant && <Pill tone="amber">Significativo</Pill>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {i.gram_stain && <Pill tone="violet">{i.gram_stain}</Pill>}
            {i.quantity && <Pill tone="gray">{i.quantity}</Pill>}
          </div>
          <CardFooter left={<Bug size={11} />} />
        </>
      )}
    />
  );
}
