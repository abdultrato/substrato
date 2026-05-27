export type NormalizedFormErrors = {
  fieldErrors: Record<string, string>
  message: string | null
  firstField?: string
}

const FORM_LEVEL_KEYS = new Set(["detail", "message", "error", "errors", "non_field_errors"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function readableKey(key: string): string {
  return key.replace(/_/g, " ")
}

export function messageFromValidationValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => messageFromValidationValue(item))
      .filter(Boolean) as string[]
    return messages.length ? messages.join("; ") : null
  }

  if (isRecord(value)) {
    const direct = value.detail ?? value.message ?? value.error
    const directMessage = messageFromValidationValue(direct)
    if (directMessage) return directMessage

    const nested = Object.entries(value)
      .map(([key, nestedValue]) => {
        const message = messageFromValidationValue(nestedValue)
        return message ? `${readableKey(key)}: ${message}` : null
      })
      .filter(Boolean) as string[]

    return nested.length ? nested.join("; ") : null
  }

  return null
}

export function normalizeFormApiErrors(
  errorOrValidation: unknown,
  knownFields: string[] = []
): NormalizedFormErrors {
  const maybeError = isRecord(errorOrValidation) ? errorOrValidation : null
  const validation =
    maybeError && "validation" in maybeError
      ? maybeError.validation
      : errorOrValidation
  const known = new Set(knownFields.filter(Boolean))
  const fieldErrors: Record<string, string> = {}
  const formMessages: string[] = []

  if (isRecord(validation)) {
    for (const [key, value] of Object.entries(validation)) {
      const message = messageFromValidationValue(value)
      if (!message) continue

      if (known.has(key) || (!known.size && !FORM_LEVEL_KEYS.has(key))) {
        fieldErrors[key] = message
      } else if (FORM_LEVEL_KEYS.has(key)) {
        formMessages.push(message)
      } else {
        formMessages.push(`${readableKey(key)}: ${message}`)
      }
    }
  } else {
    const message = messageFromValidationValue(validation)
    if (message) formMessages.push(message)
  }

  if (!formMessages.length && maybeError?.message && typeof maybeError.message === "string") {
    formMessages.push(maybeError.message)
  }

  const firstField = knownFields.find((field) => fieldErrors[field]) || Object.keys(fieldErrors)[0]

  return {
    fieldErrors,
    message: formMessages.length ? formMessages.join(" ") : null,
    firstField,
  }
}
