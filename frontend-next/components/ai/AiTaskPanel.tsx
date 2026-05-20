"use client"

import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import Badge from "@/components/ui/Badge"
import { useLanguage } from "@/hooks/useLanguage"

export type AiOperationalTask = {
  id: number
  custom_id?: string | null
  title: string
  description?: string
  module_key?: string
  assigned_group?: string
  priority?: string
  status?: string
  due_at?: string | null
  source_reference?: string
}

export default function AiTaskPanel({ task, href }: { task?: AiOperationalTask | null; href?: string }) {
  const { t } = useLanguage()
  if (!task) return null

  return (
    <div className="mt-2 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck size={16} />
            {task.title}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="success">{task.status || "open"}</Badge>
            <Badge variant="info">{task.assigned_group || t("Equipa", "Team")}</Badge>
            <Badge variant={task.priority === "critical" ? "danger" : task.priority === "high" ? "warning" : "info"}>
              {task.priority || "normal"}
            </Badge>
            {task.module_key ? <Badge variant="default">{task.module_key}</Badge> : null}
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-950 dark:text-emerald-50"
          >
            {t("Ver tarefa", "View task")}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
