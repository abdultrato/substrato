// Modelo de placa/tubo de sementeira para culturas microbiológicas.
// Persistido em MicrobiologyCulture.culture_plates (JSON). Partilhado entre a
// criação de cultura e a página de detalhe/incubação.

export type CulturePlate = {
  id: string;
  code: string;          // código único impresso na placa/tubo (gerado antes de incubar)
  container: string;     // recipiente: placa de Petri, tubo, frasco...
  medium: string;        // meio de cultura (rótulo); livre quando customMedium
  customMedium?: boolean; // true quando o meio não vem da lista (opção "Outro")
  consistency: string;   // consistência do meio: sólido, semissólido, líquido
  atmosphere: string;    // atmosfera de incubação
  temperature_c: string; // temperatura em °C
  // Incubação individual por meio — cada placa/tubo tem o seu próprio período e
  // cronómetro. Preenchidos pelo backend ao iniciar/reincubar.
  incubation_hours: string;              // horas de incubação deste meio (editável antes de incubar)
  incubation_started_at?: string | null; // início da incubação desta placa (ISO)
  incubation_expected_end_at?: string | null; // hora prevista de leitura desta placa (ISO)
};

// Recipientes habituais em microbiologia clínica.
export const CULTURE_CONTAINERS: string[] = [
  "Placa de Petri",
  "Tubo (tampa afrouxada)",
  "Tubo inclinado (slant)",
  "Frasco / garrafa",
  "Frasco de hemocultura",
  "Outro",
];

// Consistência do meio — cobre meio sólido em placa/tubo e meio líquido para
// microrganismos exigentes.
export const CULTURE_CONSISTENCIES: string[] = ["Sólido", "Semissólido", "Líquido"];

export const CULTURE_ATMOSPHERES: string[] = ["Aeróbia", "Anaeróbia", "Microaerofilia", "CO2 5%"];

// Meios de cultura mais usados. Ordenados por rótulo; "Outro" fica no fim e
// abre um campo livre.
export const CULTURE_MEDIA: string[] = [
  "Água peptonada alcalina",
  "Ágar CLED",
  "Ágar EMB (eosina-azul de metileno)",
  "Ágar Hektoen",
  "Ágar MacConkey",
  "Ágar Müller-Hinton",
  "Ágar SS (Salmonella-Shigella)",
  "Ágar Sabouraud dextrose",
  "Ágar Schaedler (anaeróbios)",
  "Ágar TCBS",
  "Ágar chocolate",
  "Ágar manitol salgado (MSA)",
  "Ágar sangue",
  "Caldo BHI (infusão cérebro-coração)",
  "Caldo Selenito F",
  "Caldo Todd-Hewitt",
  "Caldo tioglicolato",
  "Löwenstein-Jensen",
  "Meio de transporte (Stuart/Amies)",
  "Middlebrook 7H10/7H11",
  "Outro",
];

const OTHER = "Outro";

// Consistência sugerida por meio (líquidos/caldos vs. sólidos).
function suggestedConsistency(medium: string): string {
  if (/caldo|água peptonada|transporte/i.test(medium)) return "Líquido";
  return "Sólido";
}

// Recipiente sugerido por meio.
function suggestedContainer(medium: string): string {
  if (/hemocultura/i.test(medium)) return "Frasco de hemocultura";
  if (/löwenstein|middlebrook/i.test(medium)) return "Tubo inclinado (slant)";
  if (/caldo|água peptonada|transporte/i.test(medium)) return "Tubo (tampa afrouxada)";
  return "Placa de Petri";
}

export function makeCulturePlate(overrides: Partial<CulturePlate> = {}): CulturePlate {
  const medium = overrides.medium ?? "";
  return {
    id: overrides.id ?? (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).slice(0, 12),
    code: overrides.code ?? "",
    container: overrides.container ?? (medium ? suggestedContainer(medium) : "Placa de Petri"),
    medium,
    customMedium: overrides.customMedium ?? (medium ? !CULTURE_MEDIA.includes(medium) : false),
    consistency: overrides.consistency ?? (medium ? suggestedConsistency(medium) : "Sólido"),
    atmosphere: overrides.atmosphere ?? "Aeróbia",
    temperature_c: overrides.temperature_c ?? "37",
    incubation_hours: overrides.incubation_hours ?? "24",
    incubation_started_at: overrides.incubation_started_at ?? null,
    incubation_expected_end_at: overrides.incubation_expected_end_at ?? null,
  };
}

// Valor a mostrar no <select> do meio: o próprio meio se estiver na lista,
// senão "Outro" (com campo livre associado).
export function mediumSelectValue(plate: CulturePlate): string {
  if (plate.customMedium) return OTHER;
  if (plate.medium && CULTURE_MEDIA.includes(plate.medium)) return plate.medium;
  return "";
}

export function isCustomMedium(plate: CulturePlate): boolean {
  return !!plate.customMedium;
}

// Aplica a escolha do <select> de meio, tratando a opção "Outro".
export function applyMediumChoice(plate: CulturePlate, value: string): Partial<CulturePlate> {
  if (value === OTHER) {
    return { customMedium: true, medium: "" };
  }
  return {
    customMedium: false,
    medium: value,
    container: value ? suggestedContainer(value) : plate.container,
    consistency: value ? suggestedConsistency(value) : plate.consistency,
  };
}

// Gera o código único de uma placa/tubo, prefixado pelo identificador da
// cultura para ser único em todo o sistema e escrito fisicamente na placa.
// Ex.: "LCUL-20260707/00000002" + seq 1 → "LCUL-20260707-00000002-P01".
export function makePlateCode(cultureRef: string, seq: number): string {
  const base = (cultureRef || "CUL").replace(/[\/\s]+/g, "-");
  return `${base}-P${String(seq).padStart(2, "0")}`;
}

// Normaliza placas vindas do backend (inclui formatos antigos com apenas
// {label, medium}) e garante código único a cada uma. Deixa códigos já
// existentes intactos e numera os restantes sem colisões.
export function normalizePlates(raw: any[], cultureRef: string): CulturePlate[] {
  const rows: any[] = Array.isArray(raw) && raw.length ? raw : [{}];
  const used = new Set<number>();
  for (const r of rows) {
    const m = String(r?.code || "").match(/-P(\d+)$/);
    if (m) used.add(Number(m[1]));
  }
  let seq = 0;
  const nextSeq = () => {
    do {
      seq += 1;
    } while (used.has(seq));
    used.add(seq);
    return seq;
  };
  return rows.map((r) => {
    const plate = makeCulturePlate({
      medium: r?.medium ?? "",
      container: r?.container,
      consistency: r?.consistency,
      atmosphere: r?.atmosphere,
      temperature_c: r?.temperature_c != null ? String(r.temperature_c) : undefined,
      customMedium: r?.customMedium,
      incubation_hours: r?.incubation_hours != null ? String(r.incubation_hours) : undefined,
      incubation_started_at: r?.incubation_started_at ?? null,
      incubation_expected_end_at: r?.incubation_expected_end_at ?? null,
      // migra o antigo "label" livre para observação do código se não houver código
      code: r?.code || "",
    });
    if (!plate.code) plate.code = makePlateCode(cultureRef, nextSeq());
    return plate;
  });
}

// Reatribui códigos sequenciais a partir do identificador da cultura,
// preservando a ordem. Usado quando a cultura passa a ter custom_id.
export function reassignCodes(plates: CulturePlate[], cultureRef: string): CulturePlate[] {
  return plates.map((p, i) => ({ ...p, code: makePlateCode(cultureRef, i + 1) }));
}
