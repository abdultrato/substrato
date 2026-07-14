"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

// Navegação unificada do Laboratório Clínico (todas as áreas do painel).
const TABS: Tab[] = [
  { href: "/clinical-laboratory", label: "Painel" },
  { href: "/clinical-laboratory/sectors", label: "Sectores" },
  { href: "/clinical-laboratory/tests", label: "Exames" },
  { href: "/clinical-laboratory/panels", label: "Painéis" },
  { href: "/clinical-laboratory/orders", label: "Pedidos" },
  { href: "/clinical-laboratory/collections", label: "Coletas" },
  { href: "/clinical-laboratory/samples", label: "Amostras" },
  { href: "/clinical-laboratory/reception", label: "Recepção" },
  { href: "/clinical-laboratory/rejections", label: "Rejeições" },
  { href: "/clinical-laboratory/worklists", label: "Listas de Trabalho" },
  { href: "/clinical-laboratory/quality-control", label: "Controlo de Qualidade" },
  { href: "/clinical-laboratory/validations", label: "Validações" },
  { href: "/clinical-laboratory/reports", label: "Laudos" },
  { href: "/clinical-laboratory/critical-results", label: "Críticos" },
  { href: "/clinical-laboratory/cultures", label: "Culturas" },
  { href: "/clinical-laboratory/isolates", label: "Isolados" },
  { href: "/clinical-laboratory/antibiograms", label: "Antibiogramas" },
  { href: "/clinical-laboratory/molecular", label: "Molecular/GeneXpert" },
  { href: "/clinical-laboratory/molecular/hiv-viral-load", label: "Carga Viral HIV" },
  { href: "/clinical-laboratory/afb-smears", label: "Baciloscopia" },
  { href: "/clinical-laboratory/quality-management", label: "Qualidade" },
  { href: "/clinical-laboratory/biosafety", label: "Biossegurança" },
];

// Só a aba com o prefixo mais específico fica activa (evita, p.ex., que
// /molecular e /molecular/hiv-viral-load fiquem ambas activas).
function activeHref(pathname: string): string {
  let best = "";
  for (const tab of TABS) {
    const match =
      tab.href === "/clinical-laboratory"
        ? pathname === tab.href
        : pathname === tab.href || pathname.startsWith(tab.href + "/");
    if (match && tab.href.length > best.length) best = tab.href;
  }
  return best;
}

export default function LabNav() {
  const pathname = usePathname() || "";
  const current = activeHref(pathname);
  return (
    <nav className="sticky top-14 z-30 shrink-0 border-b border-slate-200 bg-background">
      <div className="flex flex-wrap gap-1 px-3 py-1.5 text-xs sm:px-4 md:px-6">
        {TABS.map((tab) => {
          const active = tab.href === current;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                "whitespace-nowrap rounded-full px-2.5 py-1 font-medium transition-colors " +
                (active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
