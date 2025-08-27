import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import type { SubTournament } from '../hooks/useSubTournaments';

export default function Header({ showSave = false }: { showSave?: boolean }) {
    const { isAuth, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menu, setMenu] = useState(false);
    const [sp] = useSearchParams();
    const menuRef = useRef<HTMLDivElement>(null);

    const pathname = location.pathname;
    const isDashboard = pathname === '/';
    const isBracket = pathname.startsWith('/bracket');
    const isSubList = pathname.startsWith('/tournements/');

    const [headerText, setHeaderText] = useState<string>('');

    useEffect(() => {
        if (!isBracket) {
            setHeaderText('');
            return;
        }
        const slug = pathname.match(/^\/bracket\/(.+)/)?.[1];
        if (!slug) {
            setHeaderText('');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get<SubTournament>(`subtournaments/${slug}/`);
                if (cancelled || !data) return;

                const g = (data.gender || '').toUpperCase();
                const genderLabel = g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : 'Karma';
                const wMin = (data.weight_min ?? '').toString().trim();
                const wMax = (data.weight_max ?? '').toString().trim();
                const weight = wMin || wMax ? `${wMin || '?'}–${wMax || '?'} kg` : '';
                const title = (data.title || sp.get('title') || '').toString().trim();

                setHeaderText([title, genderLabel, weight].filter(Boolean).join(' · '));
            } catch {
                const t = sp.get('title') || '';
                setHeaderText(t);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isBracket, pathname, sp]);

    const showCreateBtn = isDashboard || isSubList;
    const createLabel = isSubList ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur';

    const onCreate = () => {
        if (!isAuth) {
            navigate('/login');
            return;
        }
        if (isSubList) {
            const parentId =
                Number(new URLSearchParams(location.search).get('parent') || '0') || undefined;
            if (!parentId) {
                alert('Ana turnuva ID bulunamadı.');
                return;
            }
            navigate(`/create?mode=sub&parent=${parentId}`);
        } else {
            navigate('/create?mode=main');
        }
    };

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) setMenu(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setMenu(false);
        }
        document.addEventListener('mousedown', onDocClick);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    const [flash, setFlash] = useState<string | null>(null);
    const showFlash = (msg: string) => {
        setFlash(msg);
        window.setTimeout(() => setFlash(null), 2200);
    };

    const onShare = async () => {
        const url = window.location.href;
        const title = headerText || 'Bracket';
        try {
            if ((navigator as any).share) {
                await (navigator as any).share({ title, url });
            } else {
                await navigator.clipboard.writeText(url);
                showFlash('Bağlantı kopyalandı.');
            }
        } catch {}
    };

    // <<< DEĞİŞTİ >>> — Yazdırma akışını özel olaya devrettik
    const onPrint = () => {
        window.dispatchEvent(
            new CustomEvent('bracket:print', { detail: { title: headerText || '' } })
        );
    };

    const onSave = () => window.dispatchEvent(new CustomEvent('bracket:save'));

    return (
        <header
            className="relative z-50 h-16 px-6 flex items-center header-fix"
            style={{
                background:
                    'linear-gradient(90deg, rgba(22,163,74,0.35) 0%, rgba(67,56,202,0.35) 100%)',
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

            {isBracket && !!headerText && (
                <div className="absolute inset-x-0 flex justify-center pointer-events-none">
                    <div className="px-3 py-1 rounded text-white/90 font-semibold select-none">
                        {headerText}
                    </div>
                </div>
            )}

            <div className="ml-auto flex items-center gap-3">
                {isBracket && (
                    <>
                        <button
                            onClick={onShare}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white px-3 py-2 text-sm shadow"
                            title="Paylaş"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                            Paylaş
                        </button>

                        <button
                            onClick={onPrint}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white px-3 py-2 text-sm shadow"
                            title="Yazdır"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Yazdır
                        </button>

                        {/* Kaydet sadece girişliyken */}
                        {isAuth && (
                            <button
                                onClick={onSave}
                                className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow
                         bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400
                         border border-white/10"
                                title="Kaydet"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Kaydet
                            </button>
                        )}
                    </>
                )}

                {!isAuth ? (
                    <Link
                        to="/login"
                        className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold"
                    >
                        Giriş Yap
                    </Link>
                ) : (
                    <div className="relative" ref={menuRef}>
                        <img
                            src="https://placehold.co/40x40"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                            onClick={() => setMenu((m) => !m)}
                        />
                        {menu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[9999]">
                                <Link
                                    to="/"
                                    onClick={() => setMenu(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Ana Sayfa
                                </Link>
                                <Link
                                    to="/profile"
                                    onClick={() => setMenu(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Profilim
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

            {flash && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded">
                    {flash}
                </div>
            )}
        </header>
    );
}
