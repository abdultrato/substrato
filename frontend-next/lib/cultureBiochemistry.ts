// Catálogo de provas bioquímicas de identificação de microrganismos.
// Usado no fluxo de meio positivo da cultura: cada prova é um cartão com os
// seus campos (açúcares/indicadores) e as respectivas variabilidades de
// resultado. Persistido em culture_plates[i].biochemical (JSON).

export type BiochemField = {
  key: string;
  label: string;
  options: string[];
};

export type BiochemTestDef = {
  key: string;
  name: string;
  hint?: string;
  fields: BiochemField[];
};

// Guardado por placa: uma entrada por prova aplicada.
export type BiochemEntry = {
  key: string;
  name: string;
  values: Record<string, string>;
  notes?: string;
};

const POS_NEG = ["Positivo", "Negativo"];

// Provas mais usadas na identificação de bactérias de importância clínica.
// A ordem segue a sequência habitual de bancada (meios diferenciais primeiro).
export const BIOCHEM_CATALOG: BiochemTestDef[] = [
  {
    key: "kia",
    name: "Kligler Iron Agar (KIA / TSI)",
    hint: "Fermentação de glicose/lactose, gás e H₂S no mesmo tubo.",
    fields: [
      { key: "apex", label: "Superfície / ápice (lactose)", options: ["Alcalino — K (vermelho)", "Ácido — A (amarelo)"] },
      { key: "base", label: "Fundo / base (glicose)", options: ["Ácido — A (amarelo)", "Alcalino — K (vermelho)"] },
      { key: "gas", label: "Gás (CO₂)", options: ["Ausente", "Presente"] },
      { key: "h2s", label: "H₂S (enegrecimento)", options: ["Negativo", "Positivo"] },
    ],
  },
  {
    key: "lia",
    name: "Lisina Iron Agar (LIA)",
    hint: "Descarboxilação (fundo) e desaminação (superfície) da lisina.",
    fields: [
      { key: "base", label: "Fundo (descarboxilação)", options: ["Alcalino — K (roxo)", "Ácido — A (amarelo)"] },
      { key: "apex", label: "Superfície (desaminação)", options: ["Alcalino — K (roxo)", "Vermelho — R"] },
      { key: "h2s", label: "H₂S", options: ["Negativo", "Positivo"] },
    ],
  },
  {
    key: "phenylalanine",
    name: "Fenilalanina desaminase",
    hint: "Diferencia Proteus/Providencia/Morganella.",
    fields: [{ key: "result", label: "Resultado (FeCl₃)", options: ["Negativo", "Positivo — verde"] }],
  },
  { key: "oxidase", name: "Oxidase", fields: [{ key: "result", label: "Resultado", options: POS_NEG }] },
  { key: "catalase", name: "Catalase", fields: [{ key: "result", label: "Resultado", options: POS_NEG }] },
  {
    key: "coagulase",
    name: "Coagulase",
    hint: "Diferencia S. aureus dos estafilococos coagulase-negativos.",
    fields: [
      { key: "bound", label: "Ligada (lâmina)", options: POS_NEG },
      { key: "free", label: "Livre (tubo)", options: POS_NEG },
    ],
  },
  {
    key: "citrate",
    name: "Citrato de Simmons",
    fields: [{ key: "result", label: "Resultado", options: ["Negativo — verde", "Positivo — azul"] }],
  },
  {
    key: "urease",
    name: "Urease (Christensen)",
    fields: [{ key: "result", label: "Resultado", options: ["Negativo", "Positivo — rosa"] }],
  },
  { key: "indole", name: "Indol", fields: [{ key: "result", label: "Resultado (Kovács)", options: POS_NEG }] },
  { key: "motility", name: "Motilidade (SIM)", fields: [{ key: "result", label: "Resultado", options: ["Imóvel", "Móvel"] }] },
  { key: "mr", name: "Vermelho de metilo (VM)", fields: [{ key: "result", label: "Resultado", options: POS_NEG }] },
  { key: "vp", name: "Voges-Proskauer (VP)", fields: [{ key: "result", label: "Resultado", options: POS_NEG }] },
];

export function biochemDef(key: string): BiochemTestDef | undefined {
  return BIOCHEM_CATALOG.find((t) => t.key === key);
}

export function makeBiochemEntry(def: BiochemTestDef): BiochemEntry {
  return { key: def.key, name: def.name, values: {}, notes: "" };
}

// Resumo curto "campo: valor" para mostrar no cabeçalho da prova.
export function biochemSummary(entry: BiochemEntry): string {
  const def = biochemDef(entry.key);
  if (!def) return "";
  return def.fields
    .map((f) => entry.values[f.key])
    .filter(Boolean)
    .join(" · ");
}
