import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';

export default function DesktopAuthPage() {
    const navigate = useNavigate();
    const { isAuth, logout } = useAuth();
    const [searchParams] = useSearchParams();
    const [authorizing, setAuthorizing] = useState(false);

    const callbackUrl = useMemo(
        () => searchParams.get('callback'),
        [searchParams],
    );

    if (!callbackUrl) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent">
                <div className="glass-panel p-10 rounded-2xl w-full max-w-[440px] text-center">
                    <div className="text-red-400 text-5xl mb-4">✕</div>
                    <h1 className="text-xl font-bold text-white mb-2">Geçersiz İstek</h1>
                    <p className="text-sm text-gray-400">
                        Bu sayfa yalnızca Turnuvaist Replay uygulamasından açılabilir.
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuth) {
        const loginUrl = `/login?desktop_redirect=${encodeURIComponent(callbackUrl)}`;
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -z-10" />
                <div className="glass-panel p-10 rounded-2xl w-full max-w-[440px] text-center flex flex-col gap-5">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-display font-bold text-white">Turnuvaist Replay</h1>
                    <p className="text-sm text-gray-400">
                        Uygulamaya bağlanmak için önce giriş yapmanız gerekiyor.
                    </p>
                    <button
                        onClick={() => navigate(loginUrl, { replace: true })}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transform hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
                    >
                        Giriş Yap
                    </button>
                </div>
            </div>
        );
    }

    const username = localStorage.getItem('username') ?? 'Kullanıcı';

    function handleAuthorize() {
        setAuthorizing(true);
        try {
            const access = localStorage.getItem('access') ?? '';
            const refresh = localStorage.getItem('refresh') ?? '';
            const url = new URL(callbackUrl!);
            url.searchParams.set('access', access);
            url.searchParams.set('refresh', refresh);
            window.location.href = url.toString();
        } catch {
            setAuthorizing(false);
        }
    }

    function handleSwitchAccount() {
        logout();
        navigate(`/login?desktop_redirect=${encodeURIComponent(callbackUrl!)}`, { replace: true });
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -z-10" />

            <div className="glass-panel p-10 rounded-2xl w-full max-w-[440px] flex flex-col gap-6">
                {/* App icon */}
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">Turnuvaist Replay</h1>
                    <p className="text-sm text-gray-400">
                        Hesabınıza erişim izni istiyor
                    </p>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0f1115]/60 border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{username}</p>
                        <p className="text-gray-500 text-xs">Turnuvaist hesabı</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>

                {/* Permissions info */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Uygulama şunlara erişebilecek:</p>
                    <div className="space-y-1.5">
                        {[
                            'Hesap bilgileriniz (kullanıcı adı)',
                            'Turnuva ve müsabaka verileri',
                            'Kort kamera görüntüleri',
                        ].map((perm) => (
                            <div key={perm} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-gray-300">{perm}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-1">
                    <button
                        onClick={handleAuthorize}
                        disabled={authorizing}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transform hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {authorizing ? 'Yönlendiriliyor...' : 'Yetkilendir'}
                    </button>

                    <button
                        onClick={handleSwitchAccount}
                        className="w-full py-2.5 rounded-xl bg-transparent border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm font-medium transition-all duration-200"
                    >
                        Farklı hesapla giriş yap
                    </button>
                </div>
            </div>
        </div>
    );
}
