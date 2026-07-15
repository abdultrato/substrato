export const GENEEXPERT_ASSAY = "GENEXPERT_MTB_RIF";
export const HIV_VIRAL_LOAD_ASSAY = "CV_HIV";

export function molecularListPath(assay?: string | null): string {
  if (assay === HIV_VIRAL_LOAD_ASSAY) return "/clinical-laboratory/molecular/hiv-viral-load";
  if (assay === GENEEXPERT_ASSAY) return "/clinical-laboratory/molecular/genexpert";
  return "/clinical-laboratory/molecular";
}

export function molecularDetailPath(id: string | number, assay?: string | null): string {
  return `${molecularListPath(assay)}/${id}`;
}

export function molecularEditPath(id: string | number, assay?: string | null): string {
  return `${molecularDetailPath(id, assay)}/edit`;
}
