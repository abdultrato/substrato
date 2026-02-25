import { useEffect, useState } from "react"

export default function useLocalStorage<T> (
    key: string,
    initialValue: T
) {
    const [value, setValue] = useState<T>( () => {
        if ( typeof window === "undefined" ) return initialValue
        try {
            const stored = localStorage.getItem( key )
            return stored ? JSON.parse( stored ) : initialValue
        } catch {
            return initialValue
        }
    } )

    useEffect( () => {
        try {
            localStorage.setItem( key, JSON.stringify( value ) )
        } catch {
            // ignore write errors (quota, private mode, etc.)
        }
    }, [key, value] )

    return [value, setValue] as const
}
