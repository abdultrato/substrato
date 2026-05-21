import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getStoredLanguage,
  LANGUAGE_EXPLICIT_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  persistLanguageClient,
} from "@/lib/language"
import { translateRuntimeText } from "@/lib/i18nRuntime"

function installBrowserMock(initialStorage: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialStorage))
  const documentElement = { lang: "" }
  let cookie = ""

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    },
    navigator: {
      language: "en-US",
      languages: ["en-US"],
    },
  } as any)

  vi.stubGlobal("document", {
    documentElement,
    get cookie() {
      return cookie
    },
    set cookie(value: string) {
      cookie = value
    },
  } as any)

  return { storage, documentElement }
}

describe("language defaults and runtime translation", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("defaults to Portuguese even when browser or legacy storage is English", () => {
    installBrowserMock({
      [LANGUAGE_STORAGE_KEY]: "en",
    })

    expect(getStoredLanguage()).toBe("pt")
  })

  it("keeps English only after an explicit language switch", () => {
    installBrowserMock({
      [LANGUAGE_STORAGE_KEY]: "en",
      [LANGUAGE_EXPLICIT_STORAGE_KEY]: "1",
    })

    expect(getStoredLanguage()).toBe("en")
  })

  it("marks user language changes as explicit", () => {
    const { storage, documentElement } = installBrowserMock()

    persistLanguageClient("en", { explicit: true })

    expect(storage.get(LANGUAGE_STORAGE_KEY)).toBe("en")
    expect(storage.get(LANGUAGE_EXPLICIT_STORAGE_KEY)).toBe("1")
    expect(documentElement.lang).toBe("en")
  })

  it("translates loose English UI text back to Portuguese in Portuguese mode", () => {
    expect(translateRuntimeText("Patients", "pt")).toBe("Pacientes")
    expect(translateRuntimeText("Requests (Laboratory)", "pt")).toBe("Requisições (Laboratório)")
    expect(translateRuntimeText("Substrato Healthcare", "pt")).toBe("Substrato Saúde")
  })

  it("keeps Portuguese text Portuguese and translates it only in English mode", () => {
    expect(translateRuntimeText("Cadastro e histórico clínico.", "pt")).toBe("Cadastro e histórico clínico.")
    expect(translateRuntimeText("Cadastro e histórico clínico.", "en")).toBe("Registration and clinical history.")
  })
})
