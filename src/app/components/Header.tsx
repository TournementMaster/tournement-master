import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import type { SubTournament } from '../hooks/useSubTournaments';
type WhoAmI = { id: number; username: string; is_admin: boolean };

type HeaderProps = {
    showSave?: boolean;
};

export default function Header({ showSave }: HeaderProps) {
    const { isAuth, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [leaveBracketOpen, setLeaveBracketOpen] = useState(false);
    const [sp] = useSearchParams();
    const userMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const pathname = location.pathname;
    const isDashboard = pathname === '/';
    const isBracket = pathname.startsWith('/bracket');
    const isSubList = pathname.startsWith('/tournements/');

    const requestGoHome = (e?: { preventDefault?: () => void }) => {
        if (isBracket) {
            e?.preventDefault?.();
            setMobileMenuOpen(false);
            setUserMenuOpen(false);
            setLeaveBracketOpen(true);
            return;
        }
        setMobileMenuOpen(false);
        setUserMenuOpen(false);
        navigate('/');
    };

    // izin bayrakları
    const [canCreateMain, setCanCreateMain] = useState(false);
    const [canCreateSub, setCanCreateSub] = useState(false);

    const [headerText, setHeaderText] = useState<string>('');
    const [headerTextNoGender, setHeaderTextNoGender] = useState<string>('');
    const [paletteOnly, setPaletteOnly] = useState(false);

    const [shareOpen, setShareOpen] = useState(false);
    // const shareInputRef = useRef<HTMLInputElement>(null); // Unused ref removed

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
        const h = (e: any) => setPaletteOnly(Boolean(e?.detail?.value));
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
                const titleHasGender = ['kadın', 'erkek', 'karma', 'women', 'men', 'female', 'male']
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
        if (isSubList && !canCreateSub) { alert('Bu turnuvada düzenleme yetkiniz yok.'); return; }

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
                className="relative z-50 h-16 px-3 sm:px-6 flex items-center border-b border-premium-border bg-premium-glass backdrop-blur-xl shadow-glass"
            >
                {/* SOL: Logo + (desktop) Oluştur */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link
                        to="/"
                        onClick={(e) => requestGoHome(e)}
                        className="hidden md:inline-block text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight truncate max-w-[48vw] sm:max-w-none hover:scale-105 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        title="Turnuvaist Taekwondo"
                    >
                        Turnuvaist Taekwondo
                    </Link>

                    {/* Desktop: Oluştur butonu */}
                    {showCreateBtn && (
                        <button
                            onClick={onCreate}
                            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-premium-accent hover:bg-indigo-600 text-white px-4 py-2 text-sm font-bold shadow-neon transition-all"
                        >
                            <span className="text-lg leading-none">＋</span>
                            {createLabel}
                        </button>
                    )}
                </div>
                {/* MOBİL FALLBACK BAŞLIK: header boşsa mobilde 'Turnuvaist' göster */}
                {(!isBracket || !headerTextNoGender) && (
                    <div className="absolute inset-x-0 flex md:hidden justify-center pointer-events-none">
                        <div className="px-3 py-1 rounded text-white/90 font-semibold select-none truncate max-w-[80vw]">
                            Turnuvaist
                        </div>
                    </div>
                )}

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
                <div className="ml-auto flex items-center gap-2 sm:gap-4">
                    {/* Mobil: tek menü butonu (⋯) — tüm aksiyonlar burada */}
                    <div className="sm:hidden relative" ref={mobileMenuRef}>
                        <button
                            onClick={() => setMobileMenuOpen(v => !v)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
                            aria-label="Menü"
                            title="Menü"
                        >
                            ⋯
                        </button>

                        {mobileMenuOpen && (
                            <div
                                className="absolute right-0 mt-2 w-56 bg-premium-card border border-premium-border rounded-xl overflow-hidden z-[9999] shadow-elite"
                            >
                                {showCreateBtn && (
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); onCreate(); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-white"
                                        type="button"
                                    >
                                        ＋ {createLabel}
                                    </button>
                                )}
                                {isBracket && (
                                    <>
                                        <button
                                            onClick={() => { setMobileMenuOpen(false); setShareOpen(true); }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-white"
                                            type="button"
                                        >
                                            🔗 Paylaş
                                        </button>
                                        {isAuth && !paletteOnly && (
                                            <button onClick={() => { setMobileMenuOpen(false); onSave(); }} className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-white" type="button">💾 Kaydet</button>
                                        )}
                                    </>
                                )}
                                {!isAuth ? (
                                    <Link
                                        to="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-4 py-2.5 hover:bg-white/5 text-white"
                                    >
                                        Giriş Yap
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            to="/"
                                            onClick={(e) => { e.preventDefault(); requestGoHome(); }}
                                            className="block px-4 py-2.5 hover:bg-white/5 text-white"
                                        >
                                            Ana Sayfa
                                        </Link>
                                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 hover:bg-white/5 text-white">Profilim</Link>
                                        <button
                                            onClick={() => { logout(); setMobileMenuOpen(false); navigate('/login', { replace: true }); }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-white"
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
                            className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
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
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-2 text-sm shadow transition-colors"
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
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-2 text-sm shadow transition-colors"
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
                            className="hidden sm:inline-flex px-5 py-2 rounded-full bg-premium-accent hover:bg-indigo-600 text-white font-semibold text-sm shadow-neon transition-all"
                        >
                            Giriş Yap
                        </Link>
                    ) : (
                        <div className="hidden sm:flex items-center gap-2">
                            <Link
                                to="/"
                                onClick={(e) => requestGoHome(e)}
                                className="flex items-center justify-center w-9 h-9 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-premium-gold/30 transition-all text-gray-400 hover:text-premium-gold"
                                title="Ana Sayfa"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </Link>
                            <div className="relative" ref={userMenuRef}>
                            <div
                                className="group flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-premium-gold/30 transition-all"
                                onClick={() => setUserMenuOpen(m => !m)}
                            >
                                {/* Elite Avatar Ring */}
                                <div className="relative">
                                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-premium-gold to-yellow-600 opacity-70 blur-[1px] group-hover:opacity-100 transition-opacity" />
                                    <div className="relative w-9 h-9 rounded-full bg-premium-card flex items-center justify-center overflow-hidden border border-black">
                                        {/* Placeholder avatar or Initials */}
                                        <span className="font-bold text-xs text-premium-gold tracking-widest">TR</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#121212] rounded-full"></div>
                                </div>

                                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    Hesabım
                                </span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400 group-hover:text-premium-gold transition-colors">
                                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-premium-card border border-premium-border rounded-xl shadow-elite overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                        <p className="text-xs text-premium-gold font-bold uppercase tracking-wider">Kullanıcı</p>
                                        <p className="text-sm text-gray-300 truncate">Hoş geldin</p>
                                    </div>
                                    <Link
                                        to="/"
                                        onClick={(e) => { e.preventDefault(); requestGoHome(); }}
                                        className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        Ana Sayfa
                                    </Link>
                                    <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Profilim</Link>

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={() => { logout(); setUserMenuOpen(false); navigate('/login', { replace: true }); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                        type="button"
                                    >
                                        Çıkış Yap
                                    </button>
                                </div>
                            )}
                            </div>
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
                fileBase={(headerTextNoGender || headerText || 'bracket')}
            />

            {/* Bracket'ten Ana Sayfa'ya çıkış onayı */}
            {leaveBracketOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setLeaveBracketOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        className="relative z-10 w-[min(92vw,28rem)] rounded-2xl bg-premium-card border border-premium-border shadow-elite p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-lg font-semibold text-white mb-2">Ana sayfaya dön</div>
                        <p className="text-sm text-gray-300">
                            Bracket sayfasından çıkmak üzeresiniz.
                        </p>
                        <div className="mt-5 flex gap-2 justify-end">
                            <button
                                onClick={() => setLeaveBracketOpen(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/90"
                                type="button"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => { setLeaveBracketOpen(false); navigate('/'); }}
                                className="px-4 py-2 rounded-lg bg-premium-accent hover:bg-indigo-600 text-white font-semibold shadow-neon"
                                type="button"
                            >
                                Ana sayfaya dön
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


function ShareModal({
    open,
    onClose,
    url,
    onCopied,
    fileBase,
}: {
    open: boolean;
    onClose: () => void;
    url: string;
    onCopied: () => void;
    fileBase?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busyPdf, setBusyPdf] = useState(false);
    const [pdfErr, setPdfErr] = useState<string | null>(null);

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
            const el = inputRef.current;
            if (el) {
                el.focus(); el.select();
                // @ts-expect-error execCommand is legacy but used as clipboard fallback
                document.execCommand?.('copy');
                onCopied();
            }
        }
    };

    // Yalnızca paylaş popup'ındaki PDF indirme akışı
    const downloadPdf = async () => {
        try {
            setPdfErr(null);
            setBusyPdf(true);
            const { downloadBracketPdf } = await import('../lib/bracketPdf');
            await downloadBracketPdf(fileBase || document.title || 'bracket');
        } catch (err: any) {
            console.error(err);
            setPdfErr(`PDF oluşturulamadı: ${err?.message || String(err)}`);
        } finally {
            setBusyPdf(false);
        }
    };

    // --- Ayarlar (gerekirse oynat) ---
    const MAX_PDF_PT = 14400;            // tek sayfa PDF kenar limiti (pt ~ 200in)
    const MAX_SINGLEPAGE_PIXELS = 22_000_000; // tek sayfa raster eşik (~22MP)
    const PX_TO_PT = 0.75;               // 1px ≈ 0.75pt
    const MAX_EXPORT_WIDTH = 3200;       // raster genişlik limiti
    const JPEG_QUALITY = 0.82;           // 0..1
    const PNG_BG = '#0b0f16';

    // Asimetrik bleed: altta daha cömert pay
    const BLEED_L = 120;
    const BLEED_T = 50;
    const BLEED_R = 500;
    const BLEED_B = 700; // ⬅ en alttaki rozeti/gölgeyi garantiye al

    function tightBBox(svg: SVGSVGElement) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const all = svg.querySelectorAll<SVGGraphicsElement>('*');
        all.forEach((el) => {
            // getBBox olmayanları geç
            const anyEl = el as any;
            if (!anyEl.getBBox) return;
            try {
                const b = anyEl.getBBox();
                if (!isFinite(b.width) || !isFinite(b.height)) return;
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            } catch {
                // ignore getBBox failures on non-geometry nodes
            }
        });
        if (!isFinite(minX) || !isFinite(minY)) {
            // fallback: width/height
            const w = parseFloat(svg.getAttribute('width') || '0') || 1000;
            const h = parseFloat(svg.getAttribute('height') || '0') || 600;
            return { x: 0, y: 0, width: w, height: h };
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    async function svgToRasterDataURL(
        svg: SVGSVGElement,
        fmt: 'jpeg' | 'png' = 'jpeg',
        quality = JPEG_QUALITY,
        baseScale = 2.5
    ): Promise<{ url: string; outW: number; outH: number }> {

        // 1) Tüm içerik için sıkı bbox
        const bb = tightBBox(svg);

        // 2) Clone + görünür taşmaları içerecek asimetrik bleed
        const vbX = Math.floor(bb.x - BLEED_L);
        const vbY = Math.floor(bb.y - BLEED_T);
        const vbW = Math.ceil(bb.width + BLEED_L + BLEED_R);
        const vbH = Math.ceil(bb.height + BLEED_T + BLEED_B);

        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('overflow', 'visible');
        clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
        clone.setAttribute('width', String(vbW));
        clone.setAttribute('height', String(vbH));

        // 3) Raster ölçüsü (genişliğe göre limitle)
        let scale = baseScale;
        if (vbW * scale > MAX_EXPORT_WIDTH) scale = MAX_EXPORT_WIDTH / vbW;
        const outW = Math.max(1, Math.round(vbW * scale));
        const outH = Math.max(1, Math.round(vbH * scale));

        // 4) Serialize → <img> → canvas
        const s = new XMLSerializer().serializeToString(clone);
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

        const img = await new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('SVG rasterize edilemedi.'));
            im.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = PNG_BG;
        ctx.fillRect(0, 0, outW, outH);
        ctx.setTransform(outW / vbW, 0, 0, outH / vbH, 0, 0);
        ctx.drawImage(img, 0, 0, vbW, vbH);

        const url =
            fmt === 'png'
                ? canvas.toDataURL('image/png')
                : canvas.toDataURL('image/jpeg', quality);

        return { url, outW, outH };
    }


    // ✔ Tek sayfa (braket boyutunda) — gerekirse otomatik poster
    const downloadBracketPdfFullPage = async () => {
        try {
            setPdfErr(null);
            setBusyPdf(true);

            const svg = document.querySelector('svg[data-bracket-svg="1"]') as SVGSVGElement | null;
            if (!svg) { setPdfErr('Braket SVG bulunamadı.'); return; }

            // Raster hazırla (JPEG)
            const { url, outW, outH } = await svgToRasterDataURL(svg, 'jpeg', JPEG_QUALITY, 2.5);

            // Çok büyük tek sayfa mı? Poster’a düş
            const totalPx = outW * outH;
            const needPoster = totalPx > MAX_SINGLEPAGE_PIXELS;

            const { jsPDF } = await import('jspdf');

            if (!needPoster) {
                // ► TEK SAYFA: PDF sayfa boyutu = görüntü boyutu (pt)
                let wPt = outW * PX_TO_PT;
                let hPt = outH * PX_TO_PT;

                // 200 inç sınırı → orantılı küçült
                const s = Math.min(1, MAX_PDF_PT / Math.max(wPt, hPt));
                wPt = Math.round(wPt * s);
                hPt = Math.round(hPt * s);

                const pdf = new jsPDF({ unit: 'pt', format: [wPt, hPt], compress: true });
                pdf.addImage(url, 'JPEG', 0, 0, wPt, hPt, undefined, 'FAST');
                const base = (fileBase || document.title || 'bracket')
                    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');
                pdf.save(`${base}.pdf`);
                return;
            }

            // ► POSTER (çok sayfa, A4; %100 ölçeğe yakın)
            const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // px → pt oranı
            const k = PX_TO_PT;
            const drawWpt = outW * k;
            const pages = Math.max(1, Math.ceil((outH * k) / pageH));

            // Dilim canvas
            const rowPix = Math.floor(pageH / k);
            const slice = document.createElement('canvas');
            slice.width = outW;
            slice.height = rowPix;
            const sctx = slice.getContext('2d')!;
            sctx.imageSmoothingEnabled = true;

            // Tüm resmi belleğe tekrar yüklemek yerine <img>’i yeniden kullan
            const bigImg = await new Promise<HTMLImageElement>((res, rej) => {
                const im = new Image();
                im.onload = () => res(im);
                im.onerror = () => rej(new Error('Görüntü yüklenemedi.'));
                im.src = url;
            });

            for (let i = 0; i < pages; i++) {
                const srcY = i * rowPix;
                const srcH = Math.min(rowPix, outH - srcY);

                sctx.clearRect(0, 0, slice.width, slice.height);
                sctx.fillStyle = PNG_BG;
                sctx.fillRect(0, 0, slice.width, slice.height);
                // yalnızca görünür parçayı çiz
                sctx.drawImage(bigImg, 0, -srcY);

                const pageImg = slice.toDataURL('image/jpeg', JPEG_QUALITY);
                if (i > 0) pdf.addPage();
                pdf.addImage(pageImg, 'JPEG', 0, 0, drawWpt, srcH * k, undefined, 'FAST');
            }

            const base = (fileBase || document.title || 'bracket')
                .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._ -]/g, '').trim().replace(/\s+/g, '_');
            pdf.save(`${base}.pdf`);
        } catch (err: any) {
            console.error(err);
            setPdfErr(`PDF oluşturulamadı: ${err?.message || String(err)}`);
        } finally {
            setBusyPdf(false);
        }
    };



    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative z-10 w-[min(92vw,560px)] rounded-2xl bg-[#1c222b] border border-white/10 p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold text-lg">Paylaş / Dışa Aktar</div>
                    <button onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Kapat">✕</button>
                </div>

                {/* Link paylaş */}
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
                    {/* ✨ Yeni: PDF indir (vektör) */}
                    <button
                        onClick={downloadPdf}
                        disabled={busyPdf}
                        className={`px-4 py-2 rounded text-white font-medium ${busyPdf ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        type="button"
                        title="Braketi vektör PDF olarak indir (çok sayfalı)"
                    >
                        {busyPdf ? 'Hazırlanıyor…' : 'PDF indir'}
                    </button>

                    {pdfErr && (
                        <div className="mt-3 text-sm rounded border border-red-400/30 bg-red-500/10 text-red-200 px-3 py-2">
                            {pdfErr}
                        </div>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
}