"use client"

import { KeyboardEvent, useEffect, useState } from "react"

type Props = {
  value: number
  onChange: (value: number) => void
  ariaLabel: string
  min?: number
  max?: number
}

export default function PageSizeInput({ value, onChange, ariaLabel, min = 1, max = 999 }: Props) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10)
    const normalized = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value
    setDraft(String(normalized))
    if (normalized !== value) onChange(normalized)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      commit(event.currentTarget.value)
      event.currentTarget.blur()
    }
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        if (!/^\d{1,3}$/.test(next)) return
        const parsed = Number(next)
        if (parsed >= min && parsed <= max && parsed !== value) onChange(parsed)
      }}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      title={`${min}–${max}`}
      className="h-6 w-14 rounded-md border border-border/70 bg-background/70 px-1.5 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] focus:border-primary focus:ring-2 focus:ring-primary/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}
