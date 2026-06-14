"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type CatalogOption = {
  key: string | number
  label: string
  hint?: string
  raw: any
}

type Props = {
  placeholder?: string
  /** Recebe o termo de busca e devolve as opções já mapeadas. */
  fetcher: (query: string) => Promise<CatalogOption[]>
  /** Chamado quando o utilizador seleciona uma opção (deve adicionar o item). */
  onSelect: (option: CatalogOption) => void | Promise<void>
  disabled?: boolean
  minChars?: number
  delay?: number
}

/**
 * Combobox de busca assíncrona: o utilizador digita, vê os resultados num
 * dropdown (com preço/identificador à direita) e seleciona um para adicionar.
 * Substitui o padrão "campo de busca + lista solta" por uma seleção direta.
 */
export default function CatalogSearchSelect({
  placeholder = "Pesquisar...",
  fetcher,
  onSelect,
  disabled = false,
  minChars = 1,
  delay = 350,
}: Props) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<CatalogOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [busy, setBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < minChars) {
      setOptions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const myId = ++reqIdRef.current
    const timer = setTimeout(async () => {
      try {
        const res = await fetcher(q)
        if (reqIdRef.current === myId) {
          setOptions(res)
          setOpen(true)
          setHighlight(0)
        }
      } catch {
        if (reqIdRef.current === myId) setOptions([])
      } finally {
        if (reqIdRef.current === myId) setLoading(false)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [query, fetcher, minChars, delay])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  const choose = useCallback(
    async (opt: CatalogOption) => {
      if (busy) return
      setBusy(true)
      try {
        await onSelect(opt)
        setQuery("")
        setOptions([])
        setOpen(false)
      } finally {
        setBusy(false)
      }
    },
    [busy, onSelect]
  )

  const showDropdown = open && query.trim().length >= minChars

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled || busy}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (options.length) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, options.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === "Enter") {
            e.preventDefault()
            if (options[highlight]) choose(options[highlight])
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        className="h-9 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60"
      />
      {showDropdown ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado.</div>
          ) : (
            options.map((opt, idx) => (
              <button
                key={opt.key}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => choose(opt)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  idx === highlight ? "bg-muted" : ""
                }`}
              >
                <span className="truncate text-foreground">{opt.label}</span>
                {opt.hint ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{opt.hint}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
