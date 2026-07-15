// Catálogo de microrganismos clínicos comuns para seleção ao concluir uma
// cultura positiva. Serve o <datalist> (filtro + texto livre) do desfecho da
// placa; o utilizador pode sempre escrever um nome fora desta lista.

export type MicroorganismGroup = {
  label: string;
  organisms: string[];
};

export const MICROORGANISM_CATALOG: MicroorganismGroup[] = [
  {
    label: "Gram-negativos — Enterobacteriaceae",
    organisms: [
      "Escherichia coli",
      "Klebsiella pneumoniae",
      "Klebsiella oxytoca",
      "Enterobacter cloacae",
      "Enterobacter aerogenes",
      "Proteus mirabilis",
      "Proteus vulgaris",
      "Serratia marcescens",
      "Citrobacter freundii",
      "Morganella morganii",
      "Providencia stuartii",
      "Salmonella spp.",
      "Salmonella Typhi",
      "Shigella spp.",
      "Yersinia enterocolitica",
    ],
  },
  {
    label: "Gram-negativos — não fermentadores e outros",
    organisms: [
      "Pseudomonas aeruginosa",
      "Acinetobacter baumannii",
      "Stenotrophomonas maltophilia",
      "Burkholderia cepacia",
      "Haemophilus influenzae",
      "Moraxella catarrhalis",
      "Neisseria gonorrhoeae",
      "Neisseria meningitidis",
      "Vibrio cholerae",
      "Campylobacter jejuni",
      "Helicobacter pylori",
    ],
  },
  {
    label: "Gram-positivos",
    organisms: [
      "Staphylococcus aureus",
      "Staphylococcus aureus (MRSA)",
      "Staphylococcus epidermidis",
      "Staphylococcus saprophyticus",
      "Streptococcus pyogenes (grupo A)",
      "Streptococcus agalactiae (grupo B)",
      "Streptococcus pneumoniae",
      "Enterococcus faecalis",
      "Enterococcus faecium",
      "Listeria monocytogenes",
      "Corynebacterium spp.",
    ],
  },
  {
    label: "Anaeróbios",
    organisms: [
      "Bacteroides fragilis",
      "Clostridium perfringens",
      "Clostridioides difficile",
      "Peptostreptococcus spp.",
      "Fusobacterium spp.",
    ],
  },
  {
    label: "Fungos / leveduras",
    organisms: [
      "Candida albicans",
      "Candida glabrata",
      "Candida tropicalis",
      "Candida krusei",
      "Cryptococcus neoformans",
      "Aspergillus fumigatus",
    ],
  },
  {
    label: "Micobactérias",
    organisms: [
      "Mycobacterium tuberculosis",
      "Mycobacterium avium complex (MAC)",
    ],
  },
];

export const MICROORGANISM_OPTIONS: string[] = MICROORGANISM_CATALOG.flatMap(
  (group) => group.organisms,
);
