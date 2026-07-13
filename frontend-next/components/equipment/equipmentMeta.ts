import {
  Activity,
  AirVent,
  Armchair,
  Droplets,
  FlaskConical,
  HeartPulse,
  Microscope,
  Monitor,
  Orbit,
  Printer,
  Radiation,
  Refrigerator,
  Scale,
  Scan,
  Server,
  Syringe,
  TestTube,
  Thermometer,
  Waves,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

export type EquipmentRow = Record<string, any>;

export type EquipmentStatusMeta = {
  label: string;
  bar: string;
  chip: string;
  dot: string;
};

/** Estado operacional calculado da última inspeção (FUNCIONANDO/AVARIADO/DESLIGADO). */
export const EQUIPMENT_STATUS_META: Record<string, EquipmentStatusMeta> = {
  FUNCIONANDO: {
    label: "A funcionar",
    bar: "border-l-emerald-500 dark:border-l-emerald-400",
    chip: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  AVARIADO: {
    label: "Avariado",
    bar: "border-l-rose-500 dark:border-l-rose-400",
    chip: "border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  DESLIGADO: {
    label: "Desligado",
    bar: "border-l-slate-400 dark:border-l-slate-500",
    chip: "border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

export const EQUIPMENT_STATUS_FALLBACK: EquipmentStatusMeta = {
  label: "Sem inspeção",
  bar: "border-l-border",
  chip: "border-white/25 bg-white/[0.05] text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]",
  dot: "bg-muted-foreground/50",
};

export function equipmentStatusMeta(row: EquipmentRow): EquipmentStatusMeta {
  const code = String(row?.current_status ?? "").toUpperCase();
  const meta = EQUIPMENT_STATUS_META[code];
  if (!meta) return EQUIPMENT_STATUS_FALLBACK;
  const label = String(row?.current_status_label ?? "") || meta.label;
  return { ...meta, label };
}

const ICON_BY_KEYWORD: Array<[RegExp, typeof Wrench]> = [
  [/microsc/i, Microscope],
  [/centrifug/i, Orbit],
  [/frigor|gelad|freezer|c[âa]mara fria|refriger/i, Refrigerator],
  [/autoclave|esteriliz/i, Zap],
  [/balan[çc]a|peso/i, Scale],
  [/servidor|server/i, Server],
  [/computador|desktop|laptop|port[áa]til/i, Monitor],
  [/impressora|printer/i, Printer],
  [/analisador|hemat|bioqu[íi]m|qu[íi]mica/i, FlaskConical],
  [/pipeta|tubo|reagente/i, TestTube],
  [/raio|rx\b|x-?ray|tomograf|tac\b|resson/i, Radiation],
  [/ultrass|ecograf|doppler/i, Waves],
  [/ventilador|respirador/i, Wind],
  [/ar condicionado|climatiza|hvac/i, AirVent],
  [/monitor.*(sinais|paciente|card)|multiparam/i, Activity],
  [/bomba.*infus|infus[ãa]o/i, Droplets],
  [/cadeira|marquesa|poltrona/i, Armchair],
  [/estufa|incubadora|termo|banho[- ]maria/i, Thermometer],
  [/desfibril|electrocardi|eletrocardi|ecg|cardi/i, HeartPulse],
  [/seringa|injec/i, Syringe],
  [/scanner|digitaliz/i, Scan],
];

/** Ícone simbólico deduzido do nome/modelo do equipamento; Wrench como neutro. */
export function pickEquipmentIcon(row: EquipmentRow): typeof Wrench {
  const haystack = `${row?.name ?? ""} ${row?.model ?? ""} ${row?.manufacturer ?? ""}`;
  for (const [pattern, icon] of ICON_BY_KEYWORD) {
    if (pattern.test(haystack)) return icon;
  }
  return Wrench;
}
