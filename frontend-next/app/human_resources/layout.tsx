// Recursos Humanos: containers principais do conteúdo transparentes.
// O seletor é limitado ao <main> do AppLayout para não afetar sidebar/header.
export default function HumanResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="contents [&_main_.bg-card]:!bg-transparent [&_main_.bg-card]:!shadow-none [&_main_.bg-\[var\(--card\)\]]:!bg-transparent [&_main_.bg-\[var\(--card\)\]]:!shadow-none">
      {children}
    </div>
  )
}
