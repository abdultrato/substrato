"use client"

import AppLayout from "@/components/layout/AppLayout"
import AccessDenied from "@/components/auth/AccessDenied"
import { useAuth } from "@/hooks/useAuth"
import { getDefaultWorkspaceHref } from "@/lib/rbac"

export default function AcessoNegadoPage() {
  const { user } = useAuth()

  return (
    <AppLayout>
      <AccessDenied
        user={user}
        fallbackHref={getDefaultWorkspaceHref(user)}
        title="Acesso negado"
        subtitle="Se isto parece um erro, peça ao administrador para ajustar o seu grupo/profile."
      />
    </AppLayout>
  )
}
