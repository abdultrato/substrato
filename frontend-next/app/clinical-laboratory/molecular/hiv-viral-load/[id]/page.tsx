"use client";

import { MolecularDetailPage } from "../../[id]/page";
import { HIV_VIRAL_LOAD_ASSAY } from "@/lib/molecularRoutes";

export default function HivViralLoadMolecularDetailPage() {
  return <MolecularDetailPage expectedAssay={HIV_VIRAL_LOAD_ASSAY} />;
}
