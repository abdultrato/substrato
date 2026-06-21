"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

// Navegação interna do módulo de Enfermagem.
const TABS: Tab[] = [
  { href: "/nursing", label: "Painel" },
  { href: "/nursing/requests", label: "Requisições" },
  { href: "/nursing/request-items", label: "Itens de requisição" },
  { href: "/nursing/colheitas", label: "Coletas" },
  { href: "/nursing/procedures", label: "Procedimentos" },
  { href: "/nursing/ward", label: "Enfermaria" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/nursing") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function NursingNav() {
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
                  ? "bg-[var(--primary-600)] text-white"
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
