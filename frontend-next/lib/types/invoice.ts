export type InvoiceSummary = {
  id: number
  code?: string
  customer?: string
  value?: number
} & Partial<{
  codigo: string
  cliente: string
  valor: number
}>

export type Fatura = InvoiceSummary
