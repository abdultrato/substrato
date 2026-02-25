"use client";

import {useEffect, useState} from "react";
import {getUser, isAuthenticated, logout} from "@/lib/auth";

export default function UserMenu() {
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<string | null>(null);

    useEffect(() => {
        setUser(getUser());
        setReady(true);
    }, []);

    if (!ready) return null;

    if (!isAuthenticated()) return null;

    return (
        <div style={{display: "flex", gap: 10, alignItems: "center"}}>
            <span>👤 {user}</span>
            <button className="btn-secondary" onClick={logout}>
                Sair
            </button>
        </div>
    );
}
