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
            className="w-full md:w-64 px-2.5 py-1 border border-[var(--border)] rounded-lg text-sm bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--gray-500)] focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-[var(--primary-500)]"
        />
    )
}
