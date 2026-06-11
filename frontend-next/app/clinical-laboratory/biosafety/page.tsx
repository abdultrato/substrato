"use client";

import Link from "next/link";
import {
  Biohazard,
  ClipboardCheck,
  Droplets,
  HardHat,
  PackageOpen,
  ShieldCheck,
  Syringe,
  Trash2,
  Skull,
  SprayCan,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import LabNav from "@/components/clinical-laboratory/LabNav";

const ITEMS = [
  { href: "/clinical-laboratory/biosafety/hazards", label: "Perigos biológicos", desc: "Registo de agentes e grupos de risco", icon: Skull },
  { href: "/clinical-laboratory/biosafety/exposure-incidents", label: "Incidentes de exposição", desc: "Picadas, mucosa, aerossol + investigação", icon: Biohazard },
  { href: "/clinical-laboratory/biosafety/ppe", label: "EPIs", desc: "Catálogo e stock de proteção individual", icon: HardHat },
  { href: "/clinical-laboratory/biosafety/ppe-distributions", label: "Distribuição de EPIs", desc: "Entrega a colaboradores/sectores", icon: PackageOpen },
  { href: "/clinical-laboratory/biosafety/waste", label: "Resíduos", desc: "Biológico, perfurocortante, químico…", icon: Trash2 },
  { href: "/clinical-laboratory/biosafety/decontamination", label: "Descontaminação", desc: "Bancadas, cabines, equipamentos", icon: SprayCan },
  { href: "/clinical-laboratory/biosafety/spills", label: "Derrames", desc: "Resposta a derrames bio/químicos", icon: Droplets },
  { href: "/clinical-laboratory/biosafety/vaccination", label: "Vacinação", desc: "Estado vacinal ocupacional", icon: Syringe },
  { href: "/clinical-laboratory/biosafety/inspections", label: "Inspeções", desc: "Checklists de biossegurança", icon: ClipboardCheck },
];

export default function BiosafetyHubPage() {
  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]} subNav={<LabNav />}>
      <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-xl bg-red-50 p-3 text-red-600"><ShieldCheck size={26} /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biossegurança</h1>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50/40">
            <span className="mt-0.5 text-red-600"><item.icon size={20} /></span>
            <span>
              <span className="block text-sm font-medium text-slate-900 group-hover:text-red-700">{item.label}</span>
              <span className="block text-xs text-slate-500">{item.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      </main>
    </AppLayout>
  );
}
