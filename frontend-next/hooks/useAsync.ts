import { useCallback, useState } from "react"

type AsyncFunction<T> = () => Promise<T>

export default function useAsync<T> () {
    const [data, setData] = useState<T | null>( null )
    const [error, setError] = useState<unknown>( null )
    const [loading, setLoading] = useState( false )

    const execute = useCallback( async ( fn: AsyncFunction<T> ) => {
        setLoading( true )
        setError( null )

        try {
            const result = await fn()
            setData( result )
            return result
        } catch ( err ) {
            setError( err )
            throw err
        } finally {
            setLoading( false )
        }
    }, [] )

    const reset = () => {
        setData( null )
        setError( null )
        setLoading( false )
    }

    return {
        data,
        error,
        loading,
        execute,
        reset,
    }
}
