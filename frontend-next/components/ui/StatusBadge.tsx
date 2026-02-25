interface Props {
  status?: string | null
  label?: string
}

const styles: Record<string, string> = {
  // requisicao
  PEND: "bg-yellow-100 text-yellow-800",
  VAL: "bg-green-100 text-green-800",
  CANC: "bg-red-100 text-red-800",

  // fatura
  RASC: "bg-gray-100 text-gray-700",
  EMIT: "bg-blue-100 text-blue-800",
  PAGA: "bg-green-100 text-green-800",
  ANUL: "bg-red-100 text-red-800",

  // ativo/inativo
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-700",
}

export default function StatusBadge ( { status, label }: Props ) {
  if ( !status && !label ) return null

  const key = ( status ?? label ?? "" ).toUpperCase()
  const style = styles[key] ?? "bg-gray-100 text-gray-700"

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {label ?? status}
    </span>
  )
}
