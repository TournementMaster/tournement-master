/* src/app/lib/api.ts */
import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://api.turnuvaist.com/api/',
    // headers, interceptors vb. ekleyebilirsiniz
});

export function setAuth(token: string | null) {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}

/* ------------------------------------------------------------------
   401 INTERCEPTOR & CIRCULAR DEP ÇÖZÜMÜ
   auth.ts, api.ts'yi import ediyor. api.ts'nin de logout/refresh'e
   ihtiyacı var. Bunu 'injection' ile çözüyoruz.
------------------------------------------------------------------ */
type AuthLogic = {
    logout: () => void;
    refreshToken: () => Promise<boolean>;
};

let authLogic: AuthLogic | null = null;

export function injectAuthLogic(logic: AuthLogic) {
    authLogic = logic;
}

api.interceptors.response.use(
    resp => resp,
    async error => {
        const originalRequest = error.config;

        // Login veya Refresh istekleri 401 alıyorsa döngüye girmeden hata fırlat
        if (originalRequest.url?.includes('auth/jwt/')) {
            return Promise.reject(error);
        }

        // Diğer istekler 401 alırsa ve henüz denenmediyse
        if (error.response?.status === 401 && !originalRequest._retry && authLogic) {
            originalRequest._retry = true;
            try {
                // Sessizce refresh dene
                const refreshed = await authLogic.refreshToken();
                if (refreshed) {
                    // Başarılı olursa, yeni token setAuth ile zaten header'a yazıldı.
                    // Request'teki header'ı da güncelle:
                    originalRequest.headers.Authorization = api.defaults.headers.common.Authorization;
                    return api(originalRequest);
                }
            } catch (err) {
                // Refresh sırasında hata çıkarsa logout
            }
            // Refresh başarısız => Logout
            authLogic.logout();
        }

        return Promise.reject(error);
    }
);