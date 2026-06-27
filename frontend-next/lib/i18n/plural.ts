export type CountForms = {
  one: string
  other: string
}

const pluralRules = new Intl.PluralRules("pt-PT")

export function countForm(count: number, forms: CountForms): string {
  return pluralRules.select(count) === "one" ? forms.one : forms.other
}

export function formatCount(count: number, forms: CountForms): string {
  return `${count.toLocaleString("pt-PT")} ${countForm(count, forms)}`
}
