// Catálogo de antibióticos comuns para seleção no antibiograma/TSA. Alimenta o
// <datalist> (pesquisa/filtro + texto livre) dos campos de antibiótico; o
// utilizador pode sempre escrever um antibiótico fora desta lista.

export type AntibioticGroup = {
  label: string;
  antibiotics: string[];
};

export const ANTIBIOTIC_CATALOG: AntibioticGroup[] = [
  {
    label: "Penicilinas",
    antibiotics: [
      "Penicilina G",
      "Ampicilina",
      "Amoxicilina",
      "Amoxicilina/Ácido clavulânico",
      "Ampicilina/Sulbactam",
      "Piperacilina",
      "Piperacilina/Tazobactam",
      "Oxacilina",
      "Cloxacilina",
    ],
  },
  {
    label: "Cefalosporinas",
    antibiotics: [
      "Cefazolina",
      "Cefalexina",
      "Cefuroxima",
      "Cefoxitina",
      "Cefotaxima",
      "Ceftriaxona",
      "Ceftazidima",
      "Cefepima",
      "Ceftarolina",
    ],
  },
  {
    label: "Carbapenemos e monobactamos",
    antibiotics: ["Imipenem", "Meropenem", "Ertapenem", "Doripenem", "Aztreonam"],
  },
  {
    label: "Aminoglicosídeos",
    antibiotics: ["Gentamicina", "Amicacina", "Tobramicina", "Estreptomicina", "Netilmicina"],
  },
  {
    label: "Fluoroquinolonas",
    antibiotics: ["Ciprofloxacina", "Levofloxacina", "Moxifloxacina", "Norfloxacina", "Ofloxacina"],
  },
  {
    label: "Macrólidos e lincosamidas",
    antibiotics: ["Eritromicina", "Azitromicina", "Claritromicina", "Clindamicina"],
  },
  {
    label: "Tetraciclinas e glicilciclinas",
    antibiotics: ["Tetraciclina", "Doxiciclina", "Minociclina", "Tigeciclina"],
  },
  {
    label: "Glicopéptidos e oxazolidinonas",
    antibiotics: ["Vancomicina", "Teicoplanina", "Linezolida", "Daptomicina"],
  },
  {
    label: "Outros",
    antibiotics: [
      "Sulfametoxazol/Trimetoprim (Cotrimoxazol)",
      "Nitrofurantoína",
      "Fosfomicina",
      "Cloranfenicol",
      "Colistina",
      "Rifampicina",
      "Metronidazol",
      "Fusidato de sódio",
    ],
  },
  {
    label: "Antituberculosos",
    antibiotics: ["Isoniazida", "Rifampicina", "Etambutol", "Pirazinamida", "Estreptomicina"],
  },
  {
    label: "Antifúngicos",
    antibiotics: ["Fluconazol", "Voriconazol", "Anfotericina B", "Caspofungina", "Itraconazol", "Nistatina"],
  },
];

export const ANTIBIOTIC_OPTIONS: string[] = ANTIBIOTIC_CATALOG.flatMap((g) => g.antibiotics);
