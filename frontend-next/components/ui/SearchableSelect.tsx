"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"

export type SearchableOption = {
  value: string
  label: string
  hint?: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  allowClear?: boolean
  /** Permite escolher o texto digitado como valor novo (fora das opções). */
  allowCustom?: boolean
  id?: string
}

/**
 * Select pesquisável (combobox) sobre opções já carregadas em memória.
 * Clica para abrir, digita para filtrar, clica numa opção para selecionar.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum resultado.",
  disabled = false,
  allowClear = false,
  allowCustom = false,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => {
    const found = options.find((o) => o.value === value)
    if (found) return found
    // Valor custom (fora das opções) continua visível no botão.
    if (allowCustom && value) return { value, label: value }
    return null
  }, [options, value, allowCustom])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q
      ? options
      : options.filter(
          (o) => o.label.toLowerCase().includes(q) || (o.hint ? o.hint.toLowerCase().includes(q) : false)
        )
    if (allowCustom && q && !options.some((o) => o.value.toLowerCase() === q || o.label.toLowerCase() === q)) {
      return [...base, { value: query.trim(), label: `Usar "${query.trim()}"` }]
    }
    return base
  }, [options, query, allowCustom])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setQuery("")
    setHighlight(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function choose(opt: SearchableOption) {
    onChange(opt.value)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 shadow-sm outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/20 disabled:opacity-60"
      >
        <span className={selected ? "truncate text-slate-800" : "truncate text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          {allowClear && selected && !disabled ? (
            <X
              size={14}
              role="button"
              aria-label="Limpar"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
                setOpen(false)
              }}
              className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-600"
            />
          ) : null}
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="absolute z-[80] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setHighlight((h) => Math.min(h + 1, filtered.length - 1))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setHighlight((h) => Math.max(h - 1, 0))
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  if (filtered[highlight]) choose(filtered[highlight])
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  setOpen(false)
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">{emptyMessage}</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => choose(opt)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      idx === highlight ? "bg-slate-50" : ""
                    } ${isSelected ? "font-semibold text-slate-900" : "text-slate-700"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.hint ? <span className="shrink-0 text-xs text-slate-400">{opt.hint}</span> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
