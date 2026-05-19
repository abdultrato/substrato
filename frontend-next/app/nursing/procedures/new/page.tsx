"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import { GROUPS } from "@/lib/rbac"

export default function NovoProcedimentoPage() {
  const router = useRouter()

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Novo procedimento"
          subtitle="/nursing/procedimento/"
          actions={
            <Link
              href="/nursing/procedures"
              className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
            >
              Voltar
            </Link>
          }
        />

        <AutoForm
          endpoint="/nursing/procedimento/"
          method="post"
          submitLabel="Criar"
          onSuccess={(res) => {
            const id = res?.id ?? res?.pk ?? null
            if (id) {
              router.push(`/nursing/procedures/${id}`)
            } else {
              router.push("/nursing/procedures")
            }
          }}
        />
      </div>
    </AppLayout>
  )
}

