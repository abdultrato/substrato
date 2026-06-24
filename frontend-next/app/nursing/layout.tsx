"use client"

import type { ReactNode } from "react"

import NursingNav from "@/components/nursing/NursingNav"

export default function NursingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-0">
      <NursingNav />
      {children}
    </div>
  )
}
