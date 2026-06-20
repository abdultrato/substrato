"use client"

import { useEffect, useState } from "react"

type Props = {
  value: number | string | null | undefined
  currency?: string
  className?: string
}

const STORAGE_KEY = "substrato_hide_money_global"

function formatValue(value: Props["value"]) {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "number") return value.toLocaleString()
  const num = Number(value)
  if (!Number.isNaN(num)) return num.toLocaleString()
  return String(value)
}

export default function MoneyValue({ value, currency = "", className = "" }: Props) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0")
    } catch {
      // ignore
    }
  }, [hidden])

  const display = hidden ? "********" : formatValue(value)
  const suffix = currency ? ` ${currency}` : ""

  return (
    <span
      className={`select-none cursor-pointer ${className}`}
      onClick={() => setHidden((v) => !v)}
      title="Clique para ocultar/mostrar valor"
    >
      {display}
      {display === "-" ? "" : suffix}
    </span>
  )
}
