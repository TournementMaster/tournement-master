import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setU] = useState('');
    const [password, setP] = useState('');
    const [error, setErr] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        try {
            await login(username, password);
            localStorage.setItem('username', username);
            sessionStorage.setItem('last_password', password);
            navigate('/', { replace: true });
        } catch (err: any) {
            console.error("Login hatasi:", err);
            // auth service içinden export ettiğimiz fonksiyonu kullanabiliriz,
            // ama burada circular import olmasın diye basitçe err.response.data kontrolü:
            let msg = 'Geçersiz kullanıcı adı veya şifre';
            if (err?.response?.data?.detail) {
                msg = err.response.data.detail;
            }
            setErr(msg);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent relative overflow-hidden">
            {/* Arka plan dekoratif elementleri (opsiyonel, global gradient zaten var ama vurgu için) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -z-10" />

            <form onSubmit={handleSubmit} className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-[400px] relative z-10 flex flex-col gap-5">
                <div className="text-center mb-2">
                    <h1 className="text-3xl font-display font-bold text-white mb-1">Giriş Yap</h1>
                    <p className="text-sm text-gray-400">Hesabınıza erişmek için bilgilerinizi girin</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-4 py-3 rounded-lg text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Kullanıcı Adı</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-[#0f1115]/60 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-[#0f1115]/80 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-200"
                            placeholder="Kullanıcı adınız"
                            value={username}
                            onChange={e => setU(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Şifre</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-[#0f1115]/60 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-[#0f1115]/80 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-200"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={e => setP(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Link to="/forgot" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                        Şifremi Unuttum?
                    </Link>
                </div>

                <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transform hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
                >
                    Giriş Yap
                </button>

                <div className="text-center text-sm text-gray-400 mt-2">
                    Hesabın yok mu?{' '}
                    <Link to="/register" className="font-semibold text-white hover:text-indigo-400 transition-colors">
                        Kayıt Ol
                    </Link>
                </div>
            </form>
        </div>
    );
}
