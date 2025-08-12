import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function todayTR() {
    const d = new Date()
    const day = d.getDate()
    const month = d.toLocaleDateString('tr-TR', { month: 'long' })
    return `${day} ${month[0].toUpperCase()}${month.slice(1)}`
}

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

    const centerTitle = isBracket ? (sp.get('title') ?? '') : '';
    const showCreateBtn = isDashboard || isSubList;
    const createLabel = isSubList ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur';

    const onCreate = () => {
        if (!isAuth) { navigate('/login'); return; }
        if (isSubList) {
            const parentId = Number(new URLSearchParams(location.search).get('parent') || '0') || undefined;
            if (!parentId) { alert('Ana turnuva ID bulunamadı.'); return; }
            navigate(`/create?mode=sub&parent=${parentId}`);
        } else {
            navigate('/create?mode=main');
        }
    };

    return (
        <header
            className="relative z-50 h-16 px-6 flex items-center header-fix"
            style={{
                background: 'linear-gradient(90deg, rgba(22,163,74,0.35) 0%, rgba(67,56,202,0.35) 100%)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
            }}
        >
            <div className="flex items-center gap-3">
                <Link to="/" className="text-2xl font-extrabold text-white">
                    Easy Tournament
                </Link>

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

            {isBracket && !!centerTitle && (
                <div className="absolute inset-x-0 flex justify-center pointer-events-none">
                    <div className="px-3 py-1 rounded text-white/90 font-semibold select-none">
                        {centerTitle} <span className="opacity-80">· {todayTR()}</span>
                    </div>
                </div>
            )}

            <div className="ml-auto flex items-center gap-3">
                {showSave && (
                    <button
                        onClick={() => {
                            // Bracket bileşeni bu olayı dinleyip gerçek kaydı yapacak
                            window.dispatchEvent(new CustomEvent('bracket:save'));
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-semibold shadow"
                    >
                        <span className="text-lg leading-none">💾</span>
                        Kaydet
                    </button>
                )}

                {!isAuth ? (
                    <Link to="/login" className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold">
                        Giriş Yap
                    </Link>
                ) : (
                    <div className="relative">
                        <img
                            src="https://placehold.co/40x40"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                            onClick={() => setMenu((m) => !m)}
                        />
                        {menu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[9999]" onMouseLeave={() => setMenu(false)}>
                                <Link to="/" onClick={() => setMenu(false)} className="block px-4 py-2 hover:bg-gray-100 text-gray-800">
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
    )
}
