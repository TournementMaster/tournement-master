// src/app/pages/Dashboard/Dashboard.tsx
/* =========================================================================
   FILE: src/app/pages/Dashboard/Dashboard.tsx
   - Ana turnuvaları listeler
   - Sol üst köşedeki yıl rozeti yerine üç nokta menüsü (Düzenle/Sil)
   - TS daraltmalar: data için Array guard, byText/filtered için net tipler
   - Menü öğelerine premium yazı stili ve emoji uygulandı
   - Giriş yapılmamışsa /login'e yönlendirir (next= mevcut sayfa)
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTournaments, type Tournament } from '../../hooks/useTournaments';
import { api } from '../../lib/api';

type SortKey = 'recent' | 'alpha';
type Me = { is_admin:boolean };

export default function Dashboard() {
    const { data, isLoading, isError, error, refetch } = useTournaments();

    const [sort, setSort] = useState<SortKey>('recent');
    const [isAdmin, setIsAdmin] = useState(false);
    const [q, setQ] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading) {
            (async () => {
                try {
                    const { data } = await api.get<Me>('me/');
                    setIsAdmin(Boolean(data?.is_admin));
                } catch { setIsAdmin(false); }
            })();
        }
    }, [isLoading]);

    // ➜ Giriş kontrolü
    useEffect(() => {
        try {
            const token = localStorage.getItem('access');
            if (!token) {
                const next = encodeURIComponent(location.pathname + location.search);
                navigate(`/login?next=${next}`, { replace: true });
            }
        } catch {
            // storage yoksa yine login'e
            const next = encodeURIComponent(location.pathname + location.search);
            navigate(`/login?next=${next}`, { replace: true });
        }
    }, []); // yalnız ilk render’da kontrol

    // id↔slug haritalarını yaz
    useEffect(() => {
        if (!Array.isArray(data)) return;
        try {
            const idToSlug: Record<number, string> = {};
            const slugToId: Record<string, number> = {};
            for (const t of data) {
                idToSlug[t.id] = t.public_slug;
                slugToId[t.public_slug] = t.id;
            }
            sessionStorage.setItem('tournament_id_to_slug', JSON.stringify(idToSlug));
            sessionStorage.setItem('tournament_slug_to_id', JSON.stringify(slugToId));
        } catch {
            // sesssionStorage kapalıysa sessiz geç
        }
    }, [data]);

    const filtered = useMemo<Tournament[]>(() => {
        const base: Tournament[] = Array.isArray(data) ? data : [];

        const term = q.trim().toLowerCase();
        const byText: Tournament[] = term
            ? base.filter((t) => t.title.toLowerCase().includes(term))
            : base;

        const cloned = [...byText];
        if (sort === 'alpha') {
            cloned.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        } else {
            cloned.sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );
        }
        return cloned;
    }, [data, q, sort]);

    /* ----------------------- Durum ekranları ----------------------- */
    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={Array.isArray(data) ? data.length : 0}
                    subdued
                />
                <SkeletonGrid />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={Array.isArray(data) ? data.length : 0}
                    subdued
                />
                <div className="mt-8 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6">
                    <p className="text-red-300 font-semibold mb-2">Veri alınamadı.</p>
                    <p className="text-sm text-gray-300 mb-4">
                        {error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!filtered.length) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={Array.isArray(data) ? data.length : 0}
                />
                <EmptyState isAdmin={isAdmin} />
            </div>
        );
    }

    /* ----------------------- Normal görünüm ----------------------- */
    return (
        <div className="max-w-6xl mx-auto">
            <HeaderBar
                sort={sort}
                setSort={setSort}
                q={q}
                setQ={setQ}
                total={Array.isArray(data) ? data.length : 0}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-6">
                {filtered.map((t) => (
                    <Card key={t.id} tournament={t} onChanged={refetch} />
                ))}
            </div>
        </div>
    );
}

/* =========================================================================
   ALT BİLEŞENLER (değişmedi)
   ========================================================================= */

function HeaderBar({ sort, setSort, q, setQ, total, subdued = false }: {
    sort: SortKey;
    setSort: (s: SortKey) => void;
    q: string;
    setQ: (s: string) => void;
    total: number;
    subdued?: boolean;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
            <div>
                <h2 className="text-xl font-semibold">Ana Turnuvalar</h2>
                <p className={`text-sm ${subdued ? 'text-gray-500' : 'text-gray-400'}`}>
                    Toplam <b>{total}</b> kayıt
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Hızlı ara (başlık)…"
                        className="bg-gray-700/70 px-3 py-2 rounded text-sm w-56 placeholder:text-gray-300"
                        aria-label="Turnuva ara"
                    />
                    {q && (
                        <button
                            onClick={() => setQ('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                            aria-label="Aramayı temizle"
                            title="Temizle"
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">SIRALA:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        className="bg-gray-700 px-2 py-2 rounded text-sm"
                        aria-label="Sıralama"
                    >
                        <option value="recent">Zamana göre (Yeni → Eski)</option>
                        <option value="alpha">Alfabetik (A–Z)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function Card({
                  tournament,
                  onChanged,
              }: {
    tournament: Tournament;
    onChanged: () => void;
}) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const canEdit = Boolean((tournament as any)?.can_edit);

    const dateRange =
        tournament.start_date && tournament.end_date
            ? formatDateRange(tournament.start_date, tournament.end_date)
            : null;

    const goToSubList = () =>
        navigate(`/tournements/${tournament.public_slug}?parent=${tournament.id}`);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (ev: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    async function doDelete() {
        try {
            await api.delete(`tournaments/${encodeURIComponent(tournament.public_slug)}/`);
            setConfirmOpen(false);
            onChanged();
        } catch {
            alert('Silme başarısız.');
        }
    }

    const premiumItem =
        'flex w-full items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-white/10 font-premium';
    const premiumText = 'bg-gradient-to-r from-amber-200 via-emerald-200 to-violet-300 bg-clip-text text-transparent';

    return (
        <div
            onClick={goToSubList}
            className="group w-[260px] h-[240px] rounded-lg mx-auto bg-[#2a2d34]
                 border border-white/5 shadow-lg shadow-black/30 relative overflow-hidden
                 cursor-pointer"
            title={tournament.title}
        >
            {/* ÜST BAR (3 nokta + şehir) */}
            <div className="absolute top-0 left-0 right-0 p-2 flex items-start justify-between text-[11px] pointer-events-none">
                <div className="relative z-20 pointer-events-auto" ref={menuRef}>
                    {canEdit && (
                        <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
                            className="w-11 h-11 rounded-full flex items-center justify-center
                 bg-gray-900/70 border border-white/15 text-gray-100 text-[22px] font-semibold
                 hover:bg-gray-900/90 shadow"
                            title="Seçenekler"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            type="button"
                        >
                            ⋯
                        </button>
                    )}

                    {menuOpen && canEdit && (
                        <div
                            role="menu"
                            className="absolute left-0 mt-2 w-56 bg-[#161a20] border border-white/10 rounded-xl
                   overflow-hidden z-30 shadow-2xl"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            <button
                                role="menuitem"
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setMenuOpen(false);
                                    navigate(`/create?mode=main&edit=${encodeURIComponent(tournament.public_slug)}`);
                                }}
                                className={premiumItem}
                                type="button"
                            >
                                <span className="text-[18px]">✏️</span>
                                <span className={premiumText}>Düzenle</span>
                            </button>

                            <button
                                role="menuitem"
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setMenuOpen(false);
                                    setConfirmOpen(true);
                                }}
                                className={`${premiumItem} text-red-300 hover:bg-red-500/10`}
                                type="button"
                            >
                                <span className="text-[18px]">🗑️</span>
                                <span className={premiumText}>Sil</span>
                            </button>
                        </div>
                    )}
                </div>

                {tournament.city && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-900/40 border border-white/10 text-gray-200 self-center pointer-events-auto">
            {tournament.city}
          </span>
                )}
            </div>

            {/* ORTA LOGO – gradient boyalı mask */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-40 h-40 md:w-44 md:h-44 bg-gradient-to-br from-emerald-300 via-emerald-200 to-violet-300
               drop-shadow-[0_0_28px_rgba(167,139,250,.35)]"
                    style={{
                        WebkitMaskImage: "url('/brand/main-logo.png')",
                        maskImage: "url('/brand/main-logo.png')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                    }}
                    aria-hidden
                />
            </div>

            {/* ALT BANT: Başlık + Tarih */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
                <div className="px-3 py-2 text-center text-white font-semibold truncate">
                    {tournament.title}
                </div>
                <div className="px-3 pb-2 text-center text-xs text-gray-300 truncate">
                    {dateRange ?? 'Tarih bilgisi yok'}
                </div>
            </div>

            <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-emerald-300/50 rounded-lg transition pointer-events-none" />

            {confirmOpen && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); setConfirmOpen(false); }}
                >
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        className="relative z-10 w-[min(90vw,28rem)] bg-[#2d3038] rounded-2xl p-6 border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-semibold mb-2">Silmek istediğinize emin misiniz?</h4>
                        <p className="text-sm text-gray-300">
                            “{tournament.title}” geri alınamaz şekilde silinecek.
                        </p>
                        <div className="mt-5 flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                                type="button"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={doDelete}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-semibold"
                                type="button"
                            >
                                Evet, sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SkeletonGrid() {
    const items = Array.from({ length: 6 }, (_, i) => i);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-6">
            {items.map((i) => (
                <div
                    key={i}
                    className="w-[260px] h-[240px] rounded-lg mx-auto bg-[#2a2d34] border border-white/5 relative overflow-hidden"
                >
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/30" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ isAdmin=false }: { isAdmin?: boolean }) {
    return (
        <div className="mt-8 rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
            <div className="text-lg font-semibold mb-2">Henüz ana turnuvanız yok</div>
            <p className="text-sm text-gray-300 mb-5">Oluşturmak ister misiniz?</p>
            {isAdmin && (
                <Link to="/create?mode=main" className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
                    Turnuva Oluştur
                </Link>
            )}
        </div>
    );
}

/* Basit tarih aralığı formatlayıcı (YYYY-MM-DD → DD.MM.YYYY – DD.MM.YYYY) */
function formatDateRange(a: string, b: string) {
    try {
        const aa = new Date(a);
        const bb = new Date(b);
        const f = (d: Date) =>
            `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        return `${f(aa)} – ${f(bb)}`;
    } catch {
        return null;
    }
}
