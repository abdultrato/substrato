/**
 * Abrevia os nomes do meio de um nome completo, mantendo o primeiro nome e o
 * apelido por extenso.
 *
 * Ex.: "Adriano Langa Muendane Nhantumbo" → "Adriano L. M. Nhantumbo"
 *
 * - 0 ou 1 palavra: devolve tal como está.
 * - 2 palavras (nome + apelido): sem nomes do meio, devolve tal como está.
 * - 3+ palavras: primeiro por extenso, cada nome do meio abreviado à inicial
 *   maiúscula seguida de ponto, e o apelido (última palavra) por extenso.
 */
export function abbreviateMiddleNames(fullName?: string | null): string {
  const name = (fullName ?? "").trim().replace(/\s+/g, " ")
  if (!name) return ""

  const parts = name.split(" ")
  if (parts.length <= 2) return name

  const first = parts[0]
  const last = parts[parts.length - 1]
  const middles = parts
    .slice(1, -1)
    .map((word) => {
      const initial = [...word][0] // lida com caracteres acentuados/unicode
      return initial ? `${initial.toUpperCase()}.` : ""
    })
    .filter(Boolean)

  return [first, ...middles, last].join(" ")
}

export default abbreviateMiddleNames
