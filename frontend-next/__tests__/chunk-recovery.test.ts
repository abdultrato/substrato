import { describe, expect, it } from "vitest"

import {
  isRecoverableChunkError,
  shouldAttemptChunkRecovery,
} from "@/instrumentation-client"

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe("chunk recovery instrumentation", () => {
  it("reconhece falhas de chunk do Next.js", () => {
    expect(
      isRecoverableChunkError(
        new Error("Loading chunk app/layout failed.\n(timeout: http://127.0.0.1:5000/_next/static/chunks/app/layout.js)")
      )
    ).toBe(true)

    expect(isRecoverableChunkError("ChunkLoadError: Loading chunk 123 failed.")).toBe(true)
    expect(isRecoverableChunkError("ValidationError: Campo obrigatorio")).toBe(false)
  })

  it("evita loop de reload no mesmo URL durante a janela de recuperacao", () => {
    const storage = new MemoryStorage()
    const href = "http://127.0.0.1:5000/"

    expect(shouldAttemptChunkRecovery(storage, href, 1_000)).toBe(true)

    storage.setItem("substrato_chunk_recovery", JSON.stringify({ href, at: 1_000 }))

    expect(shouldAttemptChunkRecovery(storage, href, 20_000)).toBe(false)
    expect(shouldAttemptChunkRecovery(storage, href, 40_001)).toBe(true)
    expect(shouldAttemptChunkRecovery(storage, `${href}login/`, 20_000)).toBe(true)
  })
})
