"use client"

import { useEffect, useState } from "react"
import { subscribe } from "@/lib/toast"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastItem {
    id: number
    message: string
    type: ToastType
    duration: number
}

export default function ToastContainer () {
    const [toasts, setToasts] = useState<ToastItem[]>( [] )

    useEffect( () => {
        const unsubscribe = subscribe( ( toast ) => {
            setToasts( ( prev ) => [...prev, toast] )

            setTimeout( () => {
                setToasts( ( prev ) => prev.filter( ( t ) => t.id !== toast.id ) )
            }, toast.duration )
        } )

        return unsubscribe
    }, [] )

    function bg ( type: ToastType ) {
        switch ( type ) {
            case "success":
                return "bg-green-600"
            case "error":
                return "bg-red-600"
            case "warning":
                return "bg-yellow-500"
            default:
                return "bg-gray-800"
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map( ( t ) => (
                <div
                    key={t.id}
                    className={`${bg( t.type )} text-white px-4 py-2 rounded shadow-lg text-sm animate-fade-in`}
                >
                    {t.message}
                </div>
            ) )}
        </div>
    )
}
