/* src/app/lib/api.ts */
import axios from 'axios';

export const api = axios.create({
    baseURL: 'https://api.turnuvaist.com/api/',
    // headers, interceptors vb. ekleyebilirsiniz
});

export function setAuth(token: string | null) {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}