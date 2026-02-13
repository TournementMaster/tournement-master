// src/app/services/auth.ts
import { api, setAuth, injectAuthLogic } from "../lib/api.tsx";

interface LoginPayload { username: string; password: string }
interface RegisterPayload { username: string; password: string; email?: string }
interface Tokens { access: string; refresh: string }

const ACCESS_KEY = 'access';
const REFRESH_KEY = 'refresh';

/* ---------------- public api ---------------- */

export async function login(payload: LoginPayload): Promise<void> {
    setAuth(null); // Temiz bir giriş isteği için varolan token'ı temizle
    const { data } = await api.post<Tokens>('auth/jwt/create/', payload);
    storeTokens(data);
    try { localStorage.setItem('username', payload.username); } catch { /* empty */ }
}

// Backend hata gövdesinden mesajları toplayıp tek metne çevirir
export function extractApiMessage(err: any): string | null {
    const data = err?.response?.data;
    if (!data) return null;
    const msgs: string[] = [];
    const pushVal = (v: unknown) => {
        if (!v) return;
        if (Array.isArray(v)) v.forEach(pushVal);
        else if (typeof v === 'string') msgs.push(v);
    };
    if (typeof data === 'string') msgs.push(data);
    else if (typeof data === 'object') {
        pushVal((data as any).detail);
        pushVal((data as any).non_field_errors);
        pushVal((data as any).password);
        pushVal((data as any).username);
        pushVal((data as any).email);
        for (const v of Object.values(data)) pushVal(v as any);
    }
    const text = Array.from(new Set(msgs)).filter(Boolean).join('\n');
    return text || null;
}

export async function register(payload: RegisterPayload): Promise<void> {
    // ➜ Tutarlılık: minimum 8 karakter
    if (!payload.password || payload.password.length < 8) {
        throw new Error('Şifre en az 8 karakter olmalı.');
    }
    try {
        await api.post('auth/users/', payload);
        await login({ username: payload.username, password: payload.password });
        try { localStorage.setItem('username', payload.username); } catch { /* empty */ }
    } catch (err) {
        const msg = extractApiMessage(err) || 'Kayıt başarısız, lütfen tekrar deneyin';
        throw new Error(msg);
    }
}

export async function sendResetEmail(email: string): Promise<void> {
    try {
        await api.post('auth/users/reset_password/', { email });
    } catch {
        // backend yoksa sessizce geç
    }
}

export function logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    try { localStorage.removeItem('username'); } catch { }
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
    localStorage.setItem(ACCESS_KEY, t.access);
    localStorage.setItem(REFRESH_KEY, t.refresh);
    setAuth(t.access);
}

// Interceptor için gerekli fonksiyonları api katmanına enjekte ediyoruz
injectAuthLogic({ logout, refreshToken });
