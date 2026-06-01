import { fieldLabel } from "@/lib/ui/fieldLabels"

export type NormalizedFormErrors = {
  fieldErrors: Record<string, string>
  message: string | null
  firstField?: string
}

const FORM_LEVEL_KEYS = new Set(["detail", "message", "error", "errors", "non_field_errors"])
const PROBLEM_DETAIL_KEYS = new Set(["type", "status", "title", "detail", "instance", "code"])

type NormalizeFormErrorOptions = {
  endpoint?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function readableKey(key: string): string {
  return key.replace(/_/g, " ")
}

function readableUnknownKey(key: string): string {
  return readableKey(key)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt") + part.slice(1))
    .join(" ")
}

function readableField(key: string, endpoint?: string): string {
  return fieldLabel({ endpoint, name: key }) || readableKey(key)
}

export function sanitizeValidationMessage(message: string): string {
  const raw = String(message || "").trim()
  if (!raw) return raw

  const normalized = raw
    .replace(/ErrorDetail\(string=['"]([^'"]+)['"],\s*code=['"][^'"]+['"]\)/g, "$1")
    .replace(/^\[|\]$/g, "")
    .trim()

  const lower = normalized.toLocaleLowerCase("pt")

  if (
    lower.includes("pk inválido") ||
    lower.includes("pk invalido") ||
    lower.includes("pk inv") ||
    lower.includes("object does not exist") ||
    lower.includes("objeto não existe") ||
    lower.includes("objeto nao existe") ||
    (lower.includes("objeto") && lower.includes("existe")) ||
    lower.includes("does_not_exist")
  ) {
    return "O registo selecionado não existe ou já não está disponível. Atualize a lista e selecione novamente."
  }

  if (lower.includes("incorrect type") || lower.includes("tipo incorreto") || lower.includes("expected pk value")) {
    return "Selecione uma opção válida da lista."
  }

  if (lower.includes("this field is required") || lower.includes("campo obrigatório") || lower.includes("required")) {
    return "Este campo é obrigatório."
  }

  if (lower.includes("may not be blank") || lower.includes("não pode ficar em branco") || lower.includes("blank")) {
    return "Este campo não pode ficar em branco."
  }

  if (lower.includes("may not be null") || lower.includes("não pode ser nulo") || lower.includes("null")) {
    return "Este campo não pode ficar vazio."
  }

  if (lower.includes("already exists") || lower.includes("já existe") || lower.includes("unique")) {
    return "Já existe um registo com este valor."
  }

  if (lower.includes("permission denied") || lower.includes("permissão") || lower.includes("permission")) {
    return "A sua conta não tem permissão para concluir esta ação."
  }

  if (lower.includes("not found") || lower.includes("não encontrado") || lower.includes("nao encontrado")) {
    return "O registo solicitado não foi encontrado. Atualize a página e tente novamente."
  }

  return normalized
}

export function messageFromValidationValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return sanitizeValidationMessage(value)
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
  knownFields: string[] = [],
  options: NormalizeFormErrorOptions = {}
): NormalizedFormErrors {
  const maybeError = isRecord(errorOrValidation) ? errorOrValidation : null
  const rawValidation =
    maybeError && "validation" in maybeError
      ? maybeError.validation
      : errorOrValidation
  const rawProblem = isRecord(rawValidation) ? rawValidation : null
  const validation =
    rawProblem && isRecord(rawProblem.validationErrors)
      ? rawProblem.validationErrors
      : rawValidation
  const known = new Set(knownFields.filter(Boolean))
  const fieldErrors: Record<string, string> = {}
  const formMessages: string[] = []

  if (isRecord(validation)) {
    for (const [key, value] of Object.entries(validation)) {
      if (PROBLEM_DETAIL_KEYS.has(key)) continue
      const message = messageFromValidationValue(value)
      if (!message) continue

      if (known.has(key) || (!known.size && !FORM_LEVEL_KEYS.has(key))) {
        fieldErrors[key] = message
      } else if (FORM_LEVEL_KEYS.has(key)) {
        formMessages.push(message)
      } else {
        formMessages.push(`${readableUnknownKey(key)}: ${message}`)
      }
    }
  } else {
    const message = messageFromValidationValue(validation)
    if (message) formMessages.push(message)
  }

  const problemDetail =
    rawProblem && typeof rawProblem.detail === "string"
      ? sanitizeValidationMessage(rawProblem.detail)
      : null

  if (!Object.keys(fieldErrors).length && !formMessages.length && problemDetail) {
    formMessages.push(problemDetail)
  }

  if (!formMessages.length && !Object.keys(fieldErrors).length && maybeError?.message && typeof maybeError.message === "string") {
    formMessages.push(sanitizeValidationMessage(maybeError.message))
  }

  const firstField = knownFields.find((field) => fieldErrors[field]) || Object.keys(fieldErrors)[0]

  return {
    fieldErrors,
    message: formMessages.length ? formMessages.join(" ") : null,
    firstField,
  }
}

export function summarizeApiErrorPayload(
  payload: unknown,
  fallback = "Não foi possível concluir a operação.",
  options: NormalizeFormErrorOptions = {}
): string {
  if (isRecord(payload) && isRecord(payload.validationErrors)) {
    const fieldMessages = Object.entries(payload.validationErrors)
      .map(([key, value]) => {
        const message = messageFromValidationValue(value)
        return message ? `${readableField(key, options.endpoint)}: ${message}` : null
      })
      .filter(Boolean) as string[]
    if (fieldMessages.length) return fieldMessages.join(" ")
  }

  const direct =
    isRecord(payload)
      ? payload.detail ?? payload.message ?? payload.error
      : payload
  const directMessage = messageFromValidationValue(direct)
  if (directMessage) return directMessage

  const nestedMessage = messageFromValidationValue(payload)
  return nestedMessage || fallback
}
