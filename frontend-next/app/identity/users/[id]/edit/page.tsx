"use client"

import { useParams } from "next/navigation"

import UserProvisioningForm from "@/components/identity/UserProvisioningForm"

export default function UsersEditPage() {
  const params = useParams() as { id?: string | string[] }
  const userId = Array.isArray(params.id) ? params.id[0] : params.id

  return <UserProvisioningForm userId={userId} />
}
