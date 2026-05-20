"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  persistLanguageClient,
  toBackendLanguage,
} from "@/lib/language"
import { translateRuntimeText } from "@/lib/i18nRuntime"

type LanguageContextValue = {
  language: AppLanguage
  isPortuguese: boolean
  switchButtonLabel: string
  setLanguage: (language: AppLanguage) => Promise<void>
  toggleLanguage: () => Promise<void>
  t: (pt: string, en: string) => string
  tr: (value: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

async function syncLanguageWithBackend(language: AppLanguage): Promise<void> {
  try {
    await fetch("/api/v1/auth/language/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": toBackendLanguage(language),
      },
      body: JSON.stringify({ language: toBackendLanguage(language) }),
    })
  } catch {
    // Ignore transient failures; local language remains selected.
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE)

  useEffect(() => {
    const initial = getStoredLanguage()
    setLanguageState(initial)
    persistLanguageClient(initial)
    void syncLanguageWithBackend(initial)
  }, [])

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    persistLanguageClient(nextLanguage)
    await syncLanguageWithBackend(nextLanguage)
  }, [])

  const toggleLanguage = useCallback(async () => {
    const nextLanguage = language === "pt" ? "en" : "pt"
    await setLanguage(nextLanguage)
  }, [language, setLanguage])

  const value = useMemo<LanguageContextValue>(() => {
    const isPortuguese = language === "pt"
    return {
      language,
      isPortuguese,
      switchButtonLabel: isPortuguese ? "Mudar para Inglês" : "Change to Portuguese",
      setLanguage,
      toggleLanguage,
      t: (pt: string, en: string) => (isPortuguese ? pt : en),
      tr: (value: string) => translateRuntimeText(value, language),
    }
  }, [language, setLanguage, toggleLanguage])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
