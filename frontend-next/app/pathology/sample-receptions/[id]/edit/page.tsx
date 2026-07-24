"use client"

import { useParams } from "next/navigation"

import SampleReceptionFormPage from "../../SampleReceptionFormPage"

export default function PathologySampleReceptionsEditPage() {
  const params = useParams() as { id?: string }
  return <SampleReceptionFormPage id={String(params.id || "")} />
}
