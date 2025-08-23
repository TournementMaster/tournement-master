/* src/app/lib/api.ts */
import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8000/api/',
    // headers, interceptors vb. ekleyebilirsiniz
});

export function setAuth(token: string | null) {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}