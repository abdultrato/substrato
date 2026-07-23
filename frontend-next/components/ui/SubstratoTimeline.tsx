"use client"

import type { ReactNode } from "react"
import { CheckCircle2, Clock3 } from "lucide-react"

export type SubstratoTimelineStep = {
  label: string
  date?: ReactNode
  done?: boolean
  pendingLabel?: ReactNode
}

const TONES = [
  {
    dot: "bg-violet-400",
    line: "bg-violet-400",
    text: "text-violet-600 dark:text-violet-400",
  },
  {
    dot: "bg-sky-400",
    line: "bg-sky-400",
    text: "text-sky-600 dark:text-sky-400",
  },
  {
    dot: "bg-amber-400",
    line: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    dot: "bg-emerald-400",
    line: "bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  {
    dot: "bg-rose-400",
    line: "bg-rose-400",
    text: "text-rose-600 dark:text-rose-400",
  },
] as const

type Props = {
  steps: SubstratoTimelineStep[]
  title?: ReactNode
  status?: ReactNode
  statusClassName?: string
  accentClassName?: string
  className?: string
}

export function SubstratoTimeline({
  steps,
  title = "Cronologia",
  status,
  statusClassName = "border-violet-200 bg-violet-50/80 text-violet-700 dark:border-violet-700/40 dark:bg-violet-950/30 dark:text-violet-300",
  accentClassName = "bg-violet-500",
  className = "",
}: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accentClassName}`} />
      <div className="px-3 py-2 pl-5">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          <Clock3 size={13} />
          <span>{title}</span>
          {status ? (
            <span className={`ml-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClassName}`}>
              {status}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-max items-start gap-0 sm:min-w-0">
          {steps.map((step, index) => {
            const done = step.done ?? Boolean(step.date)
            const tone = TONES[index % TONES.length]
            return (
              <div key={`${index}-${step.label}`} className="flex min-w-[7rem] flex-1 flex-col sm:min-w-0">
                <div className="flex items-center">
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 shadow-sm ${
                      done
                        ? `border-white/60 ${tone.dot} dark:border-white/20`
                        : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={13} className="text-white" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[var(--gray-300)] dark:bg-white/20" />
                    )}
                  </span>
                  {index < steps.length - 1 ? (
                    <span
                      className={`h-0.5 flex-1 ${
                        done ? `${tone.line} opacity-60` : "bg-white/25 dark:bg-white/10"
                      }`}
                    />
                  ) : null}
                </div>
                <div className="mt-1 pr-1">
                  <p className={`text-[11px] font-semibold ${done ? tone.text : "text-[var(--gray-400)]"}`}>
                    {step.label}
                  </p>
                  <p className={`mt-0.5 text-[10px] ${done ? "text-[var(--gray-500)]" : "text-[var(--gray-300)]"}`}>
                    {step.date || step.pendingLabel || "Pendente"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
