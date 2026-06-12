// Recursos Humanos: containers principais do conteúdo transparentes.
// O seletor é limitado ao <main> do AppLayout para não afetar sidebar/header.
export default function HumanResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="contents [&_main_.bg-card]:!bg-transparent [&_main_.bg-card]:![box-shadow:0_4px_16px_rgba(255,255,255,0.35)] [&_main_.bg-\[var\(--card\)\]]:!bg-transparent [&_main_.bg-\[var\(--card\)\]]:![box-shadow:0_4px_16px_rgba(255,255,255,0.35)]">
      {children}
    </div>
  )
}
