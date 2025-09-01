import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import type { SubTournament } from '../hooks/useSubTournaments';
type WhoAmI = { id:number; username:string; is_admin:boolean };

export default function Header() {
    const { isAuth, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sp] = useSearchParams();
    const userMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const pathname = location.pathname;
    const isDashboard = pathname === '/';
    const isBracket = pathname.startsWith('/bracket');
    const isSubList = pathname.startsWith('/tournements/');

    // izin bayrakları
    const [canCreateMain, setCanCreateMain] = useState(false);
    const [canCreateSub, setCanCreateSub] = useState(false);

    const [headerText, setHeaderText] = useState<string>('');
    const [headerTextNoGender, setHeaderTextNoGender] = useState<string>('');
    const [paletteOnly, setPaletteOnly] = useState(false);

    const [shareOpen, setShareOpen] = useState(false);
    const shareInputRef = useRef<HTMLInputElement>(null);

    // dashboard’dayken admin mi?
    useEffect(() => {
        let cancelled = false;
        if (!isDashboard || !isAuth) { setCanCreateMain(false); return; }
        (async () => {
            try {
                const { data } = await api.get<WhoAmI>('me/');
                if (!cancelled) setCanCreateMain(Boolean(data?.is_admin));
            } catch { if (!cancelled) setCanCreateMain(false); }
        })();
        return () => { cancelled = true; };
    }, [isDashboard, isAuth]);

    // alt turnuva listesindeyken ilgili ana turnuva can_edit?
    useEffect(() => {
        let cancelled = false;
        if (!isSubList || !isAuth) { setCanCreateSub(false); return; }
        const slug = pathname.match(/^\/tournements\/([^/?#]+)/)?.[1];
        if (!slug) { setCanCreateSub(false); return; }
        (async () => {
            try {
                const { data } = await api.get(`tournaments/${encodeURIComponent(slug)}/`);
                if (!cancelled) setCanCreateSub(Boolean((data as any)?.can_edit));
            } catch { if (!cancelled) setCanCreateSub(false); }
        })();
        return () => { cancelled = true; };
    }, [isSubList, pathname, isAuth]);

    // InteractiveBracket'tan gelen "palette-only" sinyalini dinle
    useEffect(() => {
        const h = (e:any) => setPaletteOnly(Boolean(e?.detail?.value));
        window.addEventListener('bracket:palette-only', h);
        return () => window.removeEventListener('bracket:palette-only', h);
    }, []);

    // Bracket başlığı
    useEffect(() => {
        if (!isBracket) { setHeaderText(''); return; }
        const slug = pathname.match(/^\/bracket\/(.+)/)?.[1];
        if (!slug) { setHeaderText(''); return; }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get<SubTournament>(`subtournaments/${slug}/`);
                if (cancelled || !data) return;

                const g = (data.gender || '').toUpperCase();
                const genderLabel = g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : g ? 'Karma' : '';
                const wMin = (data.weight_min ?? '').toString().trim();
                const wMax = (data.weight_max ?? '').toString().trim();
                const weight = wMin || wMax ? `${wMin || '?'}–${wMax || '?'} kg` : '';
                const title = (data.title || sp.get('title') || '').toString().trim();
                const titleLc = title.toLocaleLowerCase('tr');
                const titleHasGender = ['kadın','erkek','karma','women','men','female','male']
                    .some(k => titleLc.includes(k));

                setHeaderText([title, !titleHasGender ? genderLabel : '', weight].filter(Boolean).join(' · '));

// Mobil varyant zaten cinsiyet içermiyor
                setHeaderTextNoGender([title, weight].filter(Boolean).join(' · '));
            } catch {
                const t = sp.get('title') || '';
                setHeaderText(t);
                setHeaderTextNoGender(t);
            }
        })();
        return () => { cancelled = true; };
    }, [isBracket, pathname, sp]);

    const showCreateBtn = (isDashboard && canCreateMain) || (isSubList && canCreateSub);
    const createLabel = isSubList ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur';

    const onCreate = () => {
        if (!isAuth) { navigate('/login'); return; }
        if (isDashboard && !canCreateMain) { alert('Bu işlem için yetkiniz yok.'); return; }
        if (isSubList && !canCreateSub)   { alert('Bu turnuvada düzenleme yetkiniz yok.'); return; }

        if (isSubList) {
            const parentId =
                Number(new URLSearchParams(location.search).get('parent') || '0') || undefined;
            if (!parentId) { alert('Ana turnuva ID bulunamadı.'); return; }
            navigate(`/create?mode=sub&parent=${parentId}`);
        } else {
            navigate('/create?mode=main');
        }
    };

    // dışarı tıklayınca menüleri kapat
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
                setMobileMenuOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setUserMenuOpen(false);
                setMobileMenuOpen(false);
            }
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
        setShareOpen(true);
    };

    // Yazdırma: özel olaya devret
    const onPrint = () => {
        window.dispatchEvent(
            new CustomEvent('bracket:print', { detail: { title: headerText || '' } })
        );
    };

    const onSave = () => window.dispatchEvent(new CustomEvent('bracket:save'));

    return (
        <>
        <header
            className="relative z-50 h-16 px-3 sm:px-6 flex items-center"
            style={{
                background: 'linear-gradient(90deg, rgba(22,163,74,0.35) 0%, rgba(67,56,202,0.35) 100%)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
            }}
        >
            {/* SOL: Logo + (desktop) Oluştur */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Link
                    to="/"
                    className="hidden md:inline-block text-2xl font-extrabold text-white truncate max-w-[48vw] sm:max-w-none"
                    title="Turnuvaist Taekwondo"
                >
                    Turnuvaist Taekwondo
                </Link>

                {/* Desktop: Oluştur butonu */}
                {showCreateBtn && (
                    <button
                        onClick={onCreate}
                        className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 text-sm font-semibold shadow"
                    >
                        <span className="text-lg leading-none">＋</span>
                        {createLabel}
                    </button>
                )}
            </div>

            {/* ORTA: Bracket başlığı */}
            {isBracket && (
                <>
                    {/* Mobil: cinsiyet yok */}
                    {!!headerTextNoGender && (
                        <div className="absolute inset-x-0 flex md:hidden justify-center pointer-events-none">
                            <div className="px-3 py-1 rounded text-white/90 font-semibold select-none truncate max-w-[80vw]">
                                {headerTextNoGender}
                            </div>
                        </div>
                    )}
                    {/* Desktop: tam metin (cinsiyet dahil) */}
                    {!!headerText && (
                        <div className="absolute inset-x-0 hidden md:flex justify-center pointer-events-none">
                            <div className="px-3 py-1 rounded text-white/90 font-semibold select-none truncate max-w-[50vw]">
                                {headerText}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* SAĞ: Aksiyonlar + Avatar */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* Mobil: tek menü butonu (⋯) — tüm aksiyonlar burada */}
                <div className="sm:hidden relative" ref={mobileMenuRef}>
                    <button
                        onClick={() => setMobileMenuOpen(v => !v)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white"
                        aria-label="Menü"
                        title="Menü"
                    >
                        ⋯
                    </button>

                    {mobileMenuOpen && (
                        <div
                            className="absolute right-0 mt-2 w-56 bg-[#161a20] border border-white/10 rounded-xl overflow-hidden z-[9999] shadow-2xl"
                        >
                            {showCreateBtn && (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); onCreate(); }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white"
                                    type="button"
                                >
                                    ＋ {createLabel}
                                </button>
                            )}
                            {isBracket && (
                                <>
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); setShareOpen(true); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white"
                                        type="button"
                                    >
                                        🔗 Paylaş
                                    </button>
                                    {isAuth && !paletteOnly && (
                                        <button onClick={() => { setMobileMenuOpen(false); onSave(); }} className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white" type="button">💾 Kaydet</button>
                                    )}
                                </>
                            )}
                            {!isAuth ? (
                                <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block px-4 py-2.5 hover:bg-white/10 text-white"
                                >
                                    Giriş Yap
                                </Link>
                            ) : (
                                <>
                                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 hover:bg-white/10 text-white">Ana Sayfa</Link>
                                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 hover:bg-white/10 text-white">Profilim</Link>
                                    <button
                                        onClick={() => { logout(); setMobileMenuOpen(false); navigate('/login', { replace: true }); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white"
                                        type="button"
                                    >
                                        Çıkış Yap
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobil: bracket sayfasında görünen paylaş butonu */}
                {isBracket && (
                    <button
                        onClick={onShare}
                        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white"
                        aria-label="Paylaş"
                        title="Paylaş"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                    </button>
                )}

                {/* Desktop: ayrı aksiyon butonları */}
                {isBracket && (
                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            onClick={onShare}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white px-3 py-2 text-sm shadow"
                            title="Paylaş"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Yazdır
                        </button>

                        {isAuth && !paletteOnly && (
                            <button
                                onClick={onSave}
                                className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow
                       bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400
                       border border-white/10"
                                title="Kaydet"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Kaydet
                            </button>
                        )}
                    </div>
                )}

                {/* Avatar / Login */}
                {!isAuth ? (
                    <Link
                        to="/login"
                        className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold"
                    >
                        Giriş Yap
                    </Link>
                ) : (
                    <div className="relative hidden sm:block" ref={userMenuRef}>
                        <img
                            src="https://placehold.co/40x40"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                            onClick={() => setUserMenuOpen(m => !m)}
                        />
                        {userMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[9999]">
                                <Link to="/" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-100 text-gray-800">Ana Sayfa</Link>
                                <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-100 text-gray-800">Profilim</Link>
                                <button
                                    onClick={() => { logout(); setUserMenuOpen(false); navigate('/login', { replace: true }); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                    type="button"
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Oluştur: mobil’de menüde olduğu için burada gizli.
          İsterseniz mini ikon olarak göstermek için aşağıyı açabilirsiniz:
          {showCreateBtn && <button className="sm:hidden ...">＋</button>} */}

            {flash && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded">
                    {flash}
                </div>
            )}
        </header>

        {/* ☝️ header dışına taşındı; artık tüm ekranı kaplar */}
        <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            url={window.location.href}
            onCopied={() => showFlash('Bağlantı kopyalandı.')}
        />
        </>
    );
}


function ShareModal({
                        open,
                        onClose,
                        url,
                        onCopied,
                    }: {
    open: boolean;
    onClose: () => void;
    url: string;
    onCopied: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    // body scroll kilidi
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // açılınca input’u seç
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.select(), 0);
    }, [open]);

    if (!open) return null;

    const doCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            onCopied();
        } catch {
            // eski tarayıcılar için fallback
            const el = inputRef.current;
            if (el) {
                el.focus(); el.select();
                document.execCommand?.('copy');
                onCopied();
            }
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-[#1c222b] border border-white/10 p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold text-lg">Bağlantıyı Paylaş</div>
                    <button onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Kapat">✕</button>
                </div>

                <label className="block text-sm text-gray-300 mb-2">Sayfa Bağlantısı</label>
                <input
                    ref={inputRef}
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full bg-[#0f141a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                />

                <div className="flex items-center justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253] text-white/90" type="button">
                        Kapat
                    </button>
                    <button onClick={doCopy} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium" type="button">
                        Kopyala
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
