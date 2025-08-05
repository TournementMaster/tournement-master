import {
    useEffect, useState, type ReactNode,
} from 'react';
import { AuthContext, type AuthCtx } from './AuthContext';
import * as auth from '../services/auth';

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem('access'));

    /* --- login / register / logout fonksiyonları --- */
    const login = async (u: string, p: string) => {
        await auth.login({ username: u, password: p });
        setIsAuth(true);
    };

    const register = async (u: string, p: string) => {
        await auth.register({ username: u, password: p });
        setIsAuth(true);
    };

    const logout = () => {
        auth.logout();
        setIsAuth(false);
    };

    /* token’ı ilk yüklemede header’a tanıt */
    useEffect(() => {
        auth.initSession();
        setIsAuth(!!localStorage.getItem('access'));
    }, []);

    /* token refresh (opsiyonel) */
    useEffect(() => {
        const id = setInterval(auth.refreshToken, 50 * 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const ctx: AuthCtx = { isAuth, login, register, logout };

    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}
