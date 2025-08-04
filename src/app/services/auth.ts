import {api, setAuth} from "../lib/api.tsx";


interface LoginPayload { username: string; password: string }
interface Tokens        { access: string; refresh: string }

const ACCESS_KEY  = 'access';
const REFRESH_KEY = 'refresh';

/* ---------------- public api ---------------- */

export async function login(payload: LoginPayload): Promise<void> {
    const { data } = await api.post<Tokens>('auth/jwt/create/', payload);
    storeTokens(data);
}

export async function register(payload: LoginPayload): Promise<void> {
    await api.post('auth/users/', payload);
    await login(payload);          // kayıt sonrası otomatik giriş
}

export function logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAuth(null);
}

export function initSession(): void {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) setAuth(token);
}

/* ---------------- token refresh ---------------- */

export async function refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;

    try {
        const { data } = await api.post<{ access: string }>('auth/jwt/refresh/', { refresh });
        localStorage.setItem(ACCESS_KEY, data.access);
        setAuth(data.access);
        return true;
    } catch {
        logout();
        return false;
    }
}

/* ---------------- helpers ---------------- */

function storeTokens(t: Tokens) {
    localStorage.setItem(ACCESS_KEY,  t.access);
    localStorage.setItem(REFRESH_KEY, t.refresh);
    setAuth(t.access);
}
