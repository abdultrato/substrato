"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

// Navegação unificada do Laboratório Clínico (funde todas as secções).
const TABS: Tab[] = [
  { href: "/clinical-laboratory", label: "Painel" },
  { href: "/clinical-laboratory/orders", label: "Pedidos" },
  { href: "/clinical-laboratory/collections", label: "Colheitas" },
  { href: "/clinical-laboratory/samples", label: "Amostras" },
  { href: "/clinical-laboratory/reception", label: "Recepção" },
  { href: "/clinical-laboratory/worklists", label: "Worklists" },
  { href: "/clinical-laboratory/results", label: "Resultados" },
  { href: "/clinical-laboratory/validations", label: "Validações" },
  { href: "/clinical-laboratory/reports", label: "Laudos" },
  { href: "/clinical-laboratory/critical-results", label: "Críticos" },
  { href: "/clinical-laboratory/cultures", label: "Microbiologia" },
  { href: "/clinical-laboratory/molecular", label: "Molecular/GeneXpert" },
  { href: "/clinical-laboratory/afb-smears", label: "Baciloscopia" },
  { href: "/clinical-laboratory/tests", label: "Catálogo" },
  { href: "/clinical-laboratory/quality-management", label: "Qualidade" },
  { href: "/clinical-laboratory/biosafety", label: "Biossegurança" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/clinical-laboratory") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function LabNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="sticky top-14 z-30 shrink-0 border-b border-slate-200 bg-background">
      <div className="flex flex-wrap gap-1 px-3 py-1.5 text-xs sm:px-4 md:px-6">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
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
