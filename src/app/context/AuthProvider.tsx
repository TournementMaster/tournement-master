import {
    useEffect, useState, type ReactNode,
} from 'react';
import { AuthContext, type AuthCtx } from './AuthContext';
import * as auth from '../services/auth';
import { setAuth} from "../lib/api.tsx";

export default function AuthProvider({ children }: { children: ReactNode }) {

    /* ───────── 1.  Token’ı SENKRON olarak header’a ekle ───────── */
    const cached = localStorage.getItem('access');
    if (cached) setAuth(cached);        // axios header hemen hazır

    /* ───────── 2.  Auth durumunu başlat ───────── */
    const [isAuth, setIsAuth] = useState(!!cached);

    /* ───────── 3.  Temel oturum eylemleri ───────── */
    const login = async (u: string, p: string) => {
        await auth.login({ username: u, password: p });
        setIsAuth(true);
    };

    const register = async (u: string, p: string, email?: string) => {
           await auth.register({ username: u, password: p, email });
        setIsAuth(true);
    };

    const logout = () => {
        auth.logout();
        setIsAuth(false);
    };

    /* ───────── 4.  Token refresh (opsiyonel) ───────── */
    useEffect(() => {
        const id = setInterval(auth.refreshToken, 50 * 60 * 1000); // 50 dk
        return () => clearInterval(id);
    }, []);

    /* ───────── 5.  Context’i yayınla ───────── */
    const ctx: AuthCtx = { isAuth, login, register, logout };

    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}