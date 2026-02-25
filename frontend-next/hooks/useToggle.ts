import { useCallback, useState } from "react"

export default function useToggle ( initial = false ) {
    const [value, setValue] = useState( initial )

    const toggle = useCallback( () => {
        setValue( ( v ) => !v )
    }, [] )

    const setTrue = useCallback( () => setValue( true ), [] )
    const setFalse = useCallback( () => setValue( false ), [] )

    return {
        value,
        toggle,
        setTrue,
        setFalse,
        setValue,
    }
}
