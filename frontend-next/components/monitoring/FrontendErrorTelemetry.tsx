"use client"

import { useEffect } from "react"

import { reportFrontendTelemetry } from "@/lib/monitoring/telemetry"

function normalizeErrorMessage(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message || value.name || "Erro no frontend"
  if (value && typeof value === "object" && "message" in value) {
    try {
      return String((value as { message?: unknown }).message || "Erro no frontend")
    } catch {
      return "Erro no frontend"
    }
  }
  return "Erro no frontend"
}

export default function FrontendErrorTelemetry() {
  useEffect(() => {
    function onWindowError(event: ErrorEvent) {
      const errorName = event.error?.name || "WindowError"
      const message = normalizeErrorMessage(event.error || event.message)
      const stack = event.error?.stack || ""
      const fileRef = event.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : ""

      reportFrontendTelemetry({
        event_type: "frontend.window_error",
        error_name: errorName,
        exception_class: errorName,
        message,
        stack,
        url: fileRef,
        metadata: {
          line: event.lineno || null,
          column: event.colno || null,
          file: event.filename || "",
        },
      })
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      const message = normalizeErrorMessage(reason)
      const errorName =
        reason instanceof Error
          ? reason.name || "UnhandledRejection"
          : "UnhandledRejection"
      const stack = reason instanceof Error ? reason.stack || "" : ""

      reportFrontendTelemetry({
        event_type: "frontend.unhandled_rejection",
        error_name: errorName,
        exception_class: errorName,
        message,
        stack,
      })
    }

    window.addEventListener("error", onWindowError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)

    return () => {
      window.removeEventListener("error", onWindowError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  return null
}
