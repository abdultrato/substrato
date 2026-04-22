"use client";

import {useEffect, useState} from "react";
import {getUser, isAuthenticated, logout} from "@/lib/auth";
import type { SessionUser } from "@/lib/session";

export default function UserMenu() {
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        setUser(getUser());
        setReady(true);
    }, []);

    if (!ready) return null;

    if (!isAuthenticated()) return null;

    return (
        <div style={{display: "flex", gap: 10, alignItems: "center"}}>
            <span>👤 {user?.full_name || user?.username || "Utilizador"}</span>
            <button className="btn-secondary" onClick={logout}>
                Sair
            </button>
        </div>
    );
}
