"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  Users,
} from "lucide-react";

import MoneyValue from "@/components/ui/MoneyValue";
import { apiFetchList } from "@/lib/api";

type Row = Record<string, any>;

type GroupDef = {
  key: string;
  title: string;
  endpoint: string;
  listHref: string;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  bar: string;
  href: (row: Row) => string;
  primary: (row: Row) => string;
  secondary: (row: Row) => string;
  trailing?: (row: Row) => React.ReactNode;
};

type GroupResult = {
  def: GroupDef;
  rows: Row[];
  total: number;
};

function str(...values: any[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v);
    }
  }
  return "";
}

/**
 * Fontes complementares consumidas pela recepção (os check-ins já são cobertos
 * pelo índice local da página): pacientes, requisições, faturas, recibos e
 * consultas, via `?search=` da API respectiva.
 */
const GROUPS_DEF: GroupDef[] = [
  {
    key: "patients",
    title: "Pacientes",
    endpoint: "/clinical/patient/",
    listHref: "/patients",
    icon: Users,
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    bar: "border-l-blue-500 dark:border-l-blue-400",
    href: (r) => `/patients/${r.id}`,
    primary: (r) => str(r.name, r.nome, `#${r.id}`),
    secondary: (r) =>
      [str(r.custom_id, r.id_custom), str(r.document_number), str(r.contact)]
        .filter(Boolean)
        .join(" · "),
  },
  {
    key: "requests",
    title: "Requisições",
    endpoint: "/clinical/labrequest/",
    listHref: "/requests",
    icon: FileText,
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    bar: "border-l-amber-500 dark:border-l-amber-400",
    href: (r) => `/requests/${r.id}`,
    primary: (r) => str(r.custom_id, r.id_custom, `#${r.id}`),
    secondary: (r) =>
      [str(r.patient_name, r.patient?.name), str(r.status, r.estado)]
        .filter(Boolean)
        .join(" · "),
  },
  {
    key: "invoices",
    title: "Faturas",
    endpoint: "/billing/invoice/",
    listHref: "/invoices",
    icon: CreditCard,
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    bar: "border-l-red-500 dark:border-l-red-400",
    href: (r) => `/invoices/${r.id}`,
    primary: (r) => str(r.custom_id, r.id_custom, `#${r.id}`),
    secondary: (r) =>
      [str(r.patient_name, r.patient?.name), str(r.status, r.estado)]
        .filter(Boolean)
        .join(" · "),
    trailing: (r) =>
      r.total !== undefined || r.valor_total !== undefined ? (
        <MoneyValue value={r.total ?? r.valor_total} />
      ) : null,
  },
  {
    key: "receipts",
    title: "Recibos",
    endpoint: "/payments/receipt/",
    listHref: "/receipts",
    icon: Receipt,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bar: "border-l-emerald-500 dark:border-l-emerald-400",
    href: (r) => `/payments/receipts/${r.id}`,
    primary: (r) => str(r.number, r.numero, r.custom_id, `#${r.id}`),
    secondary: (r) =>
      [str(r.patient_name, r.client_name), str(r.created_at).slice(0, 10)]
        .filter(Boolean)
        .join(" · "),
    trailing: (r) =>
      r.value !== undefined || r.valor !== undefined ? (
        <MoneyValue value={r.value ?? r.valor} />
      ) : null,
  },
  {
    key: "consultations",
    title: "Consultas",
    endpoint: "/consultations/consultation/",
    listHref: "/consultations",
    icon: CalendarClock,
    iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    bar: "border-l-cyan-500 dark:border-l-cyan-400",
    href: (r) => `/consultations/medical-consultations/${r.id}`,
    primary: (r) =>
      str(r.patient_name, r.patient?.name, r.custom_id, `#${r.id}`),
    secondary: (r) =>
      [
        str(r.doctor_name, r.doctor?.name),
        str(r.scheduled_for).replace("T", " ").slice(0, 16),
        str(r.status, r.estado),
      ]
        .filter(Boolean)
        .join(" · "),
  },
];

/**
 * Extensão do motor de busca da recepção: consulta em paralelo as fontes acima
 * com a pesquisa debounced e apresenta os resultados agrupados com ligação
 * directa ao detalhe.
 */
export default function ReceptionSearch({ query }: { query: string }) {
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);

    async function run() {
      const settled = await Promise.allSettled(
        GROUPS_DEF.map((def) =>
          apiFetchList<Row>(def.endpoint, {
            page: 1,
            pageSize: 5,
            query: { search: q },
            clientCache: false,
          }),
        ),
      );
      if (seq !== requestSeq.current) return;
      const next: GroupResult[] = [];
      settled.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const { items, meta } = result.value as any;
        const rows = Array.isArray(items) ? items : [];
        if (!rows.length) return;
        next.push({
          def: GROUPS_DEF[index],
          rows: rows.slice(0, 5),
          total: Number(meta?.total ?? rows.length),
        });
      });
      setGroups(next);
      setLoading(false);
    }

    void run();
  }, [query]);

  const q = query.trim();
  if (q.length < 2) return null;

  return (
    <div className="space-y-1.5 border-t border-border/50 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pacientes, requisições, faturas, recibos e consultas
        </span>
        {loading ? (
          <Loader2 size={11} className="animate-spin text-muted-foreground" />
        ) : (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
            {groups.reduce((sum, g) => sum + g.total, 0)}
          </span>
        )}
      </div>
      {!loading && groups.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Nenhum resultado noutras fontes.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ def, rows, total }) => (
            <div
              key={def.key}
              className={`rounded-xl border border-l-4 border-white/20 bg-white/20 dark:border-white/10 dark:bg-white/5 ${def.bar}`}
            >
              <div className="flex items-center gap-2 border-b border-border/50 px-2.5 py-1.5">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded ${def.iconBg}`}
                >
                  <def.icon size={11} className={def.iconColor} />
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {def.title}
                </span>
                <Link
                  href={def.listHref}
                  className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-foreground-2 hover:text-[var(--primary-700)] dark:hover:text-[var(--primary-400)]"
                  title="Abrir listagem"
                >
                  {total}
                </Link>
              </div>
              <div className="flex flex-col p-1">
                {rows.map((row) => {
                  const secondary = def.secondary(row);
                  const trailing = def.trailing?.(row);
                  return (
                    <Link
                      key={`${def.key}-${row.id}`}
                      href={def.href(row)}
                      className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/40 dark:hover:bg-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                          {def.primary(row)}
                        </p>
                        {secondary ? (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {secondary}
                          </p>
                        ) : null}
                      </div>
                      {trailing ? (
                        <span className="shrink-0 text-[10px] font-semibold text-foreground-2">
                          {trailing}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
