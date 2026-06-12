// Recursos Humanos: containers principais do conteúdo transparentes,
// com brilho branco leve apenas ao hover (containers e botões).
// O seletor é limitado ao <main> do AppLayout para não afetar sidebar/header.
export default function HumanResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "contents",
        // containers transparentes, sem sombra em repouso
        "[&_main_.bg-card]:!bg-transparent [&_main_.bg-card]:!shadow-none",
        "[&_main_.bg-\\[var\\(--card\\)\\]]:!bg-transparent [&_main_.bg-\\[var\\(--card\\)\\]]:!shadow-none",
        // brilho leve só ao hover
        "[&_main_.bg-card:hover]:![box-shadow:0_2px_10px_rgba(255,255,255,0.16)]",
        "[&_main_.bg-\\[var\\(--card\\)\\]:hover]:![box-shadow:0_2px_10px_rgba(255,255,255,0.16)]",
        // botões e links-botão: sombra apenas ao hover
        "[&_main_button:hover]:[box-shadow:0_2px_10px_rgba(255,255,255,0.16)]",
        "[&_main_a:hover]:[box-shadow:0_2px_10px_rgba(255,255,255,0.16)]",
      ].join(" ")}
    >
      {children}
    </div>
  )
}
