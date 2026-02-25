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
            className="w-full md:w-64 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
        />
    )
}
