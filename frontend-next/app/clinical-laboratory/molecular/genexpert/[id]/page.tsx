"use client";

import { MolecularDetailPage } from "../../[id]/page";
import { GENEEXPERT_ASSAY } from "@/lib/molecularRoutes";

export default function GeneXpertMolecularDetailPage() {
  return <MolecularDetailPage expectedAssay={GENEEXPERT_ASSAY} />;
}
