import {api, setAuth} from "../lib/api.tsx";

export async function login(username: string, password: string) {
    const { data } = await api.post('/auth/jwt/create/', { username, password });
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    setAuth(data.access);
}

export async function refresh() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return;
    const { data } = await api.post('/auth/jwt/refresh/', { refresh });
    localStorage.setItem('access', data.access);
    setAuth(data.access);
}