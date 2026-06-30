// Utilitários para limitar a concorrência de pedidos ao backend e retentar
// resets transitórios de ligação (ECONNRESET / "socket hang up"), comuns quando
// o `manage.py runserver` recebe muitos pedidos em paralelo no Windows.

const TRANSIENT_RE = /ECONNRESET|socket hang up|network|fetch failed|Failed to fetch/i

export function isTransientNetworkError(error: unknown): boolean {
  return TRANSIENT_RE.test(String((error as { message?: string })?.message ?? error ?? ""))
}

/** Executa `task`, retentando apenas em erros de rede transitórios. */
export async function withTransientRetry<T>(
  task: () => Promise<T>,
  { retries = 3, baseDelayMs = 400 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await task()
    } catch (error) {
      attempt += 1
      if (attempt > retries || !isTransientNetworkError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt))
    }
  }
}

/**
 * Como `Promise.all(items.map(mapper))`, mas executa no máximo `concurrency`
 * tarefas em simultâneo e retenta resets transitórios. Preserva a ordem de `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => Promise<R>,
  { concurrency = 4, retries = 3 }: { concurrency?: number; retries?: number } = {},
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function worker() {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await withTransientRetry(() => mapper(items[index], index), { retries })
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker)
  await Promise.all(workers)
  return results
}
