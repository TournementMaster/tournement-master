import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/**
 * Header artık kendi içinde:
 * - "Turnuva Oluştur" / "Alt Turnuva Oluştur" butonunun gösterilmesi ve navigasyonu
 * - Bracket sayfasında ortada alt turnuva başlığını gösterme (query ?title=…)
 * - Sağda login/avatar menüsü
 * - Arka plan (mor→yeşil, soluk) ve ikonlar
 *
 * Not: Dışarıdan yalnızca showSave (bracket’ta) gelmesi yeterli.
 */
export default function Header({ showSave = false }: { showSave?: boolean }) {
    const { isAuth, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menu, setMenu] = useState(false);
    const [sp] = useSearchParams();

    const pathname = location.pathname;
    const isDashboard = pathname === '/';
    const isBracket = pathname.startsWith('/bracket');
    const isSubList = pathname.startsWith('/tournements/');

    // Bracket sayfası için ortadaki başlık (query ?title=…)
    const centerTitle = isBracket ? (sp.get('title') ?? '') : '';

    // Oluştur butonu sadece dashboard ve alt turnuva listesinde görünür
    const showCreateBtn = isDashboard || isSubList;
    const createLabel = isSubList ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur';

    const onCreate = () => {
        if (!isAuth) {
            navigate('/login');
            return;
        }
        if (isSubList) {
            // Ana turnuva ID query’de parent olarak geliyor
            const parentId = Number(new URLSearchParams(location.search).get('parent') || '0') || undefined;
            if (!parentId) {
                alert('Ana turnuva ID bulunamadı.');
                return;
            }
            navigate(`/create?mode=sub&parent=${parentId}`);
        } else {
            navigate('/create?mode=main');
        }
    };

    return (
        <header
            className="relative z-50 h-16 px-6 flex items-center"
            style={{
                background:
                    'linear-gradient(90deg, rgba(22,163,74,0.35) 0%, rgba(67,56,202,0.35) 100%)',
                backdropFilter: 'blur(2px)',
            }}
        >
            {/* Sol taraf – Logo */}
            <div className="flex items-center gap-3">
                <Link to="/" className="text-2xl font-extrabold text-white">
                    Easy Tournament
                </Link>

                {/* Oluştur butonu (sadece dashboard veya /tournements/… de) */}
                {showCreateBtn && (
                    <button
                        onClick={onCreate}
                        className="ml-2 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 text-sm font-semibold shadow"
                    >
                        <span className="text-lg leading-none">＋</span>
                        {createLabel}
                    </button>
                )}
            </div>

            {/* Ortadaki başlık – bracket sayfasında alt turnuva başlığı */}
            {isBracket && !!centerTitle && (
                <div className="absolute inset-x-0 flex justify-center pointer-events-none">
                    <div className="px-3 py-1 rounded text-white/90 font-semibold select-none">
                        {centerTitle}
                    </div>
                </div>
            )}

            {/* Sağ taraf – Kaydet & Login/Avatar */}
            <div className="ml-auto flex items-center gap-3">
                {showSave && (
                    <button
                        onClick={() => alert('Kaydedildi!')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-semibold shadow"
                    >
                        <span className="text-lg leading-none">💾</span>
                        Kaydet
                    </button>
                )}

                {/* Giriş yapılmamışsa: mavi "Giriş Yap" butonu */}
                {!isAuth ? (
                    <Link
                        to="/login"
                        className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold"
                    >
                        Giriş Yap
                    </Link>
                ) : (
                    // Giriş yapılmışsa: avatar + menü
                    <div className="relative">
                        <img
                            src="https://placehold.co/40x40"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                            onClick={() => setMenu((m) => !m)}
                        />
                        {menu && (
                            <div
                                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[9999]"
                                onMouseLeave={() => setMenu(false)}
                            >
                                <Link
                                    to="/"
                                    onClick={() => setMenu(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setMenu(false);
                                        navigate('/login', { replace: true });
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
