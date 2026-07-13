"use client"

import Badge from "@/components/ui/Badge"
import { useLanguage } from "@/hooks/useLanguage"
import { translateAiStatusLabel, translateAiToolName } from "@/lib/aiPresentation"

export type AiToolCall = {
  id?: number
  tool_name: string
  status: string
  duration_ms?: number | null
  mode?: string
}

export default function AiToolTrace({ calls }: { calls: AiToolCall[] }) {
  const { t, language } = useLanguage()
  if (!calls.length) return null

  return (
    <div className="mt-3 rounded-xl border border-border bg-card/80 p-2">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">
        {t("Trace de ferramentas", "Tool trace")}
      </div>
      <div className="flex flex-wrap gap-2">
        {calls.map((call) => (
          <span
            key={`${call.tool_name}-${call.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
          >
            {translateAiToolName(call.tool_name, language)}
            <Badge variant={call.status === "success" ? "success" : call.status === "blocked" ? "warning" : "danger"}>
              {translateAiStatusLabel(call.status, language)}
            </Badge>
            {call.duration_ms !== null && call.duration_ms !== undefined ? (
              <span className="text-muted-foreground">{call.duration_ms}ms</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  )
}
