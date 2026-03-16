import { useState, useEffect } from "react"

interface Props {
    placeholder?: string
    onSearch: ( value: string ) => void
    delay?: number
}

export default function SearchInput ( {
    placeholder = "Pesquisar...",
    onSearch,
    delay = 400,
}: Props ) {
    const [value, setValue] = useState( "" )

    useEffect( () => {
        const timer = setTimeout( () => {
            onSearch( value )
        }, delay )

        return () => clearTimeout( timer )
    }, [value, delay, onSearch] )

    return (
        <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={( e ) => setValue( e.target.value )}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:w-64"
        />
    )
}
