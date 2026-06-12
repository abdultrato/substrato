"use client"

import { useEffect } from "react"

import { initScrollArrows } from "@/lib/ui/scrollArrows"

// Monta as setas de rolagem para as regiões roláveis do frontend (tabelas com
// overflow horizontal, corpos de modais com overflow vertical, etc.). Renderiza
// nada — apenas gere a camada de botões e oculta a barra nativa dos alvos.
const SCROLLABLE_SELECTOR =
  ".overflow-x-auto, .overflow-y-auto, .overflow-auto, .table-container, [data-scroll-arrows]"

export default function ScrollArrowsManager() {
  useEffect(() => {
    const controller = initScrollArrows({ selector: SCROLLABLE_SELECTOR })
    return () => controller.destroy()
  }, [])

  return null
}
