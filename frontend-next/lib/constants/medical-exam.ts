export const metodoExameMedicoOptions = [
  { value: "USG", label: "Ultrassonografia / Ecografia" },
  { value: "RX", label: "Raio-X Convencional" },
  { value: "CT", label: "Tomografia Computorizada (CT)" },
  { value: "RM", label: "Ressonância Magnética (RM)" },
  { value: "MG", label: "Mamografia" },
  { value: "DXA", label: "Densitometria Óssea (DXA)" },
  { value: "ECO", label: "Ecocardiograma" },
  { value: "ECG", label: "Eletrocardiograma (ECG)" },
  { value: "HOLTER", label: "Holter" },
  { value: "MAPA", label: "MAPA (PA 24h)" },
  { value: "EEG", label: "Eletroencefalograma (EEG)" },
  { value: "ENDO", label: "Endoscopia" },
  { value: "COLONO", label: "Colonoscopia" },
  { value: "ANGIO", label: "Angiografia" },
  { value: "MN", label: "Medicina Nuclear / Cintilografia" },
  { value: "OUT", label: "Outro" },
];

export const setorExameMedicoOptions = [
  { value: "Radiologia", label: "Radiologia" },
  { value: "DiagnosticoImagem", label: "Diagnóstico por Imagem" },
  { value: "Cardiologia", label: "Cardiologia" },
  { value: "GinecoObstetricia", label: "Ginecologia/Obstetrícia" },
  { value: "Ortopedia", label: "Ortopedia/Traumato" },
  { value: "Neurologia", label: "Neurologia" },
  { value: "Otorrino", label: "Otorrinolaringologia" },
  { value: "Oftalmologia", label: "Oftalmologia" },
  { value: "MedicinaNuclear", label: "Medicina Nuclear" },
  { value: "Endoscopia", label: "Endoscopia" },
  { value: "Outro", label: "Outro" },
];

export const tipoResultadoMedicoOptions = [
  { value: "PDF", label: "Laudo/Relatório (PDF)" },
  { value: "IMAGEM", label: "Imagem (JPEG/PNG)" },
  { value: "DICOM", label: "DICOM" },
  { value: "VIDEO", label: "Vídeo/loop" },
  { value: "TEXTO", label: "Texto livre" },
  { value: "NUMERICO", label: "Valor numérico" },
];

export const tiposResultadoMedicoPorMetodo: Record<string, string[]> = {
  USG: ["IMAGEM", "PDF", "VIDEO"],
  RX: ["IMAGEM", "PDF"],
  CT: ["DICOM", "IMAGEM", "PDF"],
  RM: ["DICOM", "IMAGEM", "PDF"],
  MG: ["IMAGEM", "PDF"],
  DXA: ["PDF", "IMAGEM"],
  ECO: ["IMAGEM", "PDF", "VIDEO"],
  ECG: ["PDF", "IMAGEM"],
  HOLTER: ["PDF"],
  MAPA: ["PDF"],
  EEG: ["PDF"],
  ENDO: ["VIDEO", "IMAGEM", "PDF"],
  COLONO: ["VIDEO", "IMAGEM", "PDF"],
  ANGIO: ["DICOM", "IMAGEM", "PDF"],
  MN: ["DICOM", "PDF"],
  OUT: ["PDF", "IMAGEM"],
};

export const tipoResultadoMedicoAcceptMap: Record<string, string> = {
  PDF: ".pdf,application/pdf",
  IMAGEM: "image/*",
  DICOM: ".dcm,application/dicom",
  VIDEO: "video/*",
};

export function getTiposResultadoMedicoPorMetodo(metodo?: string) {
  if (!metodo) return tipoResultadoMedicoOptions.map((opt) => opt.value);
  return tiposResultadoMedicoPorMetodo[metodo] ?? tipoResultadoMedicoOptions.map((opt) => opt.value);
}
