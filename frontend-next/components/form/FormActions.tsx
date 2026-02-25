interface Props {
    children: React.ReactNode
    align?: "left" | "right" | "between"
}

export default function FormActions ( { children, align = "right" }: Props ) {
    const alignment = {
        left: "justify-start",
        right: "justify-end",
        between: "justify-between",
    }

    return (
        <div className={`flex gap-3 mt-6 ${alignment[align]}`}>
            {children}
        </div>
    )
}
