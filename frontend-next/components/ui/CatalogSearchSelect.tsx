"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

export type CatalogOption = {
  key: string | number
  label: string
  hint?: string
  raw: any
  added?: boolean
}

type DropdownPos = { top: number; left: number; width: number; openUp: boolean }

type Props = {
  placeholder?: string
  fetcher: (query: string) => Promise<CatalogOption[]>
  onSelect: (option: CatalogOption) => void | Promise<void>
  disabled?: boolean
  minChars?: number
  delay?: number
}

const MAX_H = 256 // px — deve coincidir com max-h-64

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
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reqIdRef = useRef(0)

  const calcPos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < MAX_H + 8 && r.top > MAX_H
    setPos({
      top: openUp
        ? r.top + window.scrollY - MAX_H - 4
        : r.bottom + window.scrollY + 4,
      left: r.left + window.scrollX,
      width: r.width,
      openUp,
    })
  }, [])

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
          calcPos()
        }
      } catch {
        if (reqIdRef.current === myId) setOptions([])
      } finally {
        if (reqIdRef.current === myId) setLoading(false)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [query, fetcher, minChars, delay, calcPos])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  // Recalculate on scroll/resize so position stays correct
  useEffect(() => {
    if (!open) return
    const onMove = () => calcPos()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open, calcPos])

  const choose = useCallback(
    async (opt: CatalogOption) => {
      if (busy || opt.added) return
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

  const selectableOptions = options.filter((o) => !o.added)
  const showDropdown = open && query.trim().length >= minChars

  const dropdown = showDropdown && pos
    ? createPortal(
        <div
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            maxHeight: MAX_H,
          }}
          className="overflow-auto rounded-md border border-border bg-background shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado.</div>
          ) : (
            options.map((opt) => {
              const isAdded = !!opt.added
              const selectableIdx = selectableOptions.indexOf(opt)
              return (
                <div
                  key={opt.key}
                  onMouseEnter={() => { if (!isAdded) setHighlight(selectableIdx) }}
                  onClick={() => choose(opt)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors select-none
                    ${isAdded
                      ? "cursor-default opacity-50 bg-muted/40"
                      : `cursor-pointer hover:bg-muted ${selectableIdx === highlight ? "bg-muted" : ""}`
                    }`}
                >
                  <span className={`truncate ${isAdded ? "text-muted-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {opt.hint && !isAdded
                      ? <span className="text-xs text-muted-foreground">{opt.hint}</span>
                      : null}
                    {isAdded
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Info size={11} />já adicionado
                        </span>
                      : null}
                  </div>
                </div>
              )
            })
          )}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled || busy}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          calcPos()
        }}
        onFocus={() => {
          if (options.length) {
            calcPos()
            setOpen(true)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, selectableOptions.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === "Enter") {
            e.preventDefault()
            if (selectableOptions[highlight]) choose(selectableOptions[highlight])
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        className="h-9 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60"
      />
      {dropdown}
    </div>
  )
}
