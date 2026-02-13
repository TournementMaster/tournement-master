// src/app/pages/Dashboard/Dashboard.tsx
/* =========================================================================
   FILE: src/app/pages/Dashboard/Dashboard.tsx
   - Ana turnuvaları listeler
   - Sol üst kÃ¶şedeki yıl rozeti yerine üç nokta menüsü (Düzenle/Sil)
   - Responsive header düzenlendi (mobilde daha temiz)
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTournaments, usePublicTournaments, useLiveIndex, type Tournament } from '../../hooks/useTournaments';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { TurnuvaEmblem } from '../../components/TurnuvaEmblem';
import { EliteSelect } from '../../components/EliteSelect';

type SortKey = 'recent' | 'alpha';
type Me = { is_admin: boolean };

export default function Dashboard() {
    const { isAuth } = useAuth();
    const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
    const showPublicView = !token;
    const liveDay = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    const { data, isLoading, isError, error, refetch } = useTournaments({ enabled: !!token });
    const { data: publicData, isLoading: publicLoading, refetch: refetchPublic } = usePublicTournaments();
    const { data: liveIndex } = useLiveIndex(liveDay);

    const dataSource = showPublicView ? publicData : data;
    const isLoadingSource = showPublicView ? publicLoading : isLoading;

    const [sort, setSort] = useState<SortKey>('recent');
    const [isAdmin, setIsAdmin] = useState(false);
    const [q, setQ] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuth || isLoading) return;
        (async () => {
            try {
                const { data: meData } = await api.get<Me>('me/');
                setIsAdmin(Boolean(meData?.is_admin));
            } catch { setIsAdmin(false); }
        })();
    }, [isAuth, isLoading]);


    // id↔slug maps (own + public list)â†”slug haritaları (hem kendi hem public listesi için)
    useEffect(() => {
        const list = Array.isArray(dataSource) ? dataSource : [];
        if (!list.length) return;
        try {
            const idToSlug: Record<number, string> = {};
            const slugToId: Record<string, number> = {};
            for (const t of list) {
                idToSlug[t.id] = t.public_slug;
                slugToId[t.public_slug] = t.id;
            }
            sessionStorage.setItem('tournament_id_to_slug', JSON.stringify(idToSlug));
            sessionStorage.setItem('tournament_slug_to_id', JSON.stringify(slugToId));
        } catch {
            // sesssionStorage kapalıysa sessiz geç
        }
    }, [dataSource]);

    const filtered = useMemo<Tournament[]>(() => {
        const base: Tournament[] = Array.isArray(dataSource) ? dataSource : [];

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
    }, [dataSource, q, sort]);

    /* ----------------------- Durum ekranları ----------------------- */
    if (isLoadingSource) {
        return (
            <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={Array.isArray(dataSource) ? dataSource.length : 0}
                    subdued
                />
                <SkeletonGrid />
            </div>
        );
    }

    if (isError) {
        // 500 hatası veya veri yoksa boş state göster
        const is500 = error && typeof error === 'object' && 'response' in error &&
            (error as any)?.response?.status === 500;

        if (is500) {
            return (
                <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
                    <HeaderBar
                        sort={sort}
                        setSort={setSort}
                        q={q}
                        setQ={setQ}
                        total={0}
                        subdued
                    />
                    <EmptyState isAdmin={isAdmin} />
                </div>
            );
        }

        return (
            <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={Array.isArray(dataSource) ? dataSource.length : 0}
                    subdued
                />
                <div className="mt-8 rounded-lg bg-white/[0.02] border border-red-500/30 p-6 backdrop-blur-sm">
                    <p className="text-red-300 font-semibold mb-2">Veri alınamadı.</p>
                    <p className="text-sm text-slate-300 mb-4">
                        {error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 rounded bg-premium-accent hover:bg-indigo-600 text-sm transition-colors"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!filtered.length) {
        return (
            <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
                {showPublicView ? (
                    <PublicLanding
                        tournaments={[]}
                        liveTournaments={liveIndex?.tournaments ?? []}
                        sort={sort}
                        setSort={setSort}
                        q={q}
                        setQ={setQ}
                        total={0}
                    />
                ) : (
                    <>
                        <HeaderBar
                            sort={sort}
                            setSort={setSort}
                            q={q}
                            setQ={setQ}
                            total={Array.isArray(dataSource) ? dataSource.length : 0}
                        />
                        <EmptyState isAdmin={isAdmin} />
                    </>
                )}
            </div>
        );
    }

    /* ----------------------- Normal gÃ¶rünüm ----------------------- */
    if (showPublicView) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
                <PublicLanding
                    tournaments={filtered}
                    liveTournaments={liveIndex?.tournaments ?? []}
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={filtered.length}
                />
            </div>
        );
    }

    // ✅ Giriş yapan kullanıcılar: mevcut sistem/tasarım (değiştirmiyoruz)
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <HeaderBar
                sort={sort}
                setSort={setSort}
                q={q}
                setQ={setQ}
                total={Array.isArray(dataSource) ? dataSource.length : 0}
                title="Ana Turnuvalar"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-6">
                {filtered.map((t) => (
                    <PrivateCard key={t.id} tournament={t} onChanged={refetch} />
                ))}
            </div>
        </div>
    );
}

function PublicLanding({
    tournaments,
    liveTournaments,
    sort,
    setSort,
    q,
    setQ,
    total,
}: {
    tournaments: Tournament[];
    liveTournaments: { slug: string; title: string }[];
    sort: SortKey;
    setSort: (s: SortKey) => void;
    q: string;
    setQ: (s: string) => void;
    total: number;
}) {
    const ACCENTS = [
        {
            name: 'indigo',
            glow: 'from-indigo-500/25 via-fuchsia-500/15 to-transparent',
            border: 'border-indigo-400/20 hover:border-indigo-300/35',
            chip: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-100',
            header: 'from-indigo-500/25 via-indigo-500/10 to-transparent',
        },
        {
            name: 'emerald',
            glow: 'from-emerald-400/20 via-cyan-400/12 to-transparent',
            border: 'border-emerald-400/20 hover:border-emerald-300/35',
            chip: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100',
            header: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
        },
        {
            name: 'amber',
            glow: 'from-amber-400/20 via-rose-400/12 to-transparent',
            border: 'border-amber-400/20 hover:border-amber-300/35',
            chip: 'bg-amber-500/10 border-amber-400/20 text-amber-100',
            header: 'from-amber-500/20 via-amber-500/10 to-transparent',
        },
        {
            name: 'cyan',
            glow: 'from-cyan-400/20 via-indigo-500/12 to-transparent',
            border: 'border-cyan-400/20 hover:border-cyan-300/35',
            chip: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100',
            header: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
        },
        {
            name: 'rose',
            glow: 'from-rose-400/20 via-violet-500/12 to-transparent',
            border: 'border-rose-400/20 hover:border-rose-300/35',
            chip: 'bg-rose-500/10 border-rose-400/20 text-rose-100',
            header: 'from-rose-500/20 via-rose-500/10 to-transparent',
        },
    ] as const;

    const pickAccent = (key: string) => {
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        return ACCENTS[h % ACCENTS.length];
    };

    const heroAccent = pickAccent(`hero:${(liveTournaments?.[0]?.slug || '')}:${total}`);

    return (
        <div className="pt-4 space-y-6">
            {/* FULL CANVAS BACKDROP (public only) */}
            <div className="relative">
                <div className="absolute inset-0 -z-10 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-indigo-500/22 via-fuchsia-500/12 to-transparent blur-[80px]" />
                    <div className="absolute top-10 right-[-120px] w-[540px] h-[540px] rounded-full bg-gradient-to-br from-cyan-400/18 via-emerald-400/12 to-transparent blur-[90px]" />
                    <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[820px] h-[520px] rounded-full bg-gradient-to-br from-amber-400/14 via-rose-400/10 to-transparent blur-[110px]" />
                </div>

                {/* HERO */}
                <section className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] backdrop-blur-xl shadow-elite`}>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={`absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full bg-gradient-to-br ${heroAccent.glow} blur-[90px]`} />
                        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_38%),radial-gradient(circle_at_82%_62%,rgba(255,255,255,0.05),transparent_46%)]" />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
                    </div>

                    <div className="relative px-6 py-7 sm:px-8 sm:py-10">
                        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
                            <div className="min-w-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-glass">
                                        <TurnuvaEmblem variant="main" size={44} className="opacity-90" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[11px] tracking-[0.3em] uppercase text-white/60 font-semibold">
                                            Public Arena
                                        </div>
                                        <h1 className="mt-1 text-3xl sm:text-4xl font-display font-black tracking-tight">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-fuchsia-200">
                                                Turnuvaist
                                            </span>{' '}
                                            <span className="text-white/90">Taekwondo</span>
                                        </h1>
                                        <p className="mt-2 text-sm sm:text-base text-white/70 max-w-xl">
                                            Canlı maçları takip edin. Public turnuvaları tek ekranda keşfedin.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                                        Canlı oda: <b className="text-white tabular-nums">{liveTournaments.length}</b>
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                                        Turnuva: <b className="text-white tabular-nums">{total}</b>
                                    </span>
                                    <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                                        Hızlı arama · Sıralama · Canlı geçiş
                                    </span>
                                </div>

                            </div>

                            {/* LIVE SPOTLIGHT */}
                            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-xl">
                                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${heroAccent.header}`} />
                                <div className="relative p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                                            <div>
                                                <div className="text-sm font-semibold text-white/90">
                                                    Canlı Maç Odası
                                                </div>
                                                <div className="text-xs text-white/55">
                                                    Şu an oynanan maçlar
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-white/55 tabular-nums">
                                            {liveTournaments.length}
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {liveTournaments.length ? (
                                            <>
                                                {liveTournaments.slice(0, 4).map((t) => {
                                                    const a = pickAccent(`live:${t.slug}`);
                                                    return (
                                                        <Link
                                                            key={t.slug}
                                                            to={`/live/${t.slug}`}
                                                            className={[
                                                                'group block rounded-2xl px-4 py-3 border bg-white/[0.03] hover:bg-white/[0.06] transition-colors',
                                                                a.border,
                                                            ].join(' ')}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-white truncate">
                                                                        {t.title}
                                                                    </div>
                                                                    <div className="text-xs text-white/55">
                                                                        Canlı akışa git
                                                                    </div>
                                                                </div>
                                                                <div className="text-white/70 group-hover:text-white transition-colors">
                                                                    →
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}

                                                {liveTournaments.length > 4 && (
                                                    <div className="pt-1 text-xs text-white/55">
                                                        +{liveTournaments.length - 4} canlı turnuva daha…
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="rounded-2xl px-4 py-4 bg-white/[0.03] border border-white/10 text-sm text-white/65">
                                                Şu an canlı maç bulunmuyor.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* TOOLBAR + GRID */}
            <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
                <div className="relative">
                    <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-r from-indigo-500/15 via-cyan-400/10 to-rose-400/12 blur-[22px]" />
                    <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-elite px-4 py-4 sm:px-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="relative flex-1">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Turnuva ara…"
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:border-premium-accent/55 transition-colors"
                                    aria-label="Turnuva ara"
                                />
                                {q && (
                                    <button
                                        onClick={() => setQ('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                                        aria-label="Aramayı temizle"
                                        title="Temizle"
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div className="sm:hidden">
                                <EliteSelect
                                    value={sort}
                                    onChange={(v) => setSort(v as SortKey)}
                                    ariaLabel="Sıralama"
                                    options={[
                                        { value: 'recent', label: 'Yeni → Eski' },
                                        { value: 'alpha', label: 'A–Z' },
                                    ]}
                                    className="w-full"
                                    menuClassName="min-w-[220px]"
                                />
                            </div>

                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                                <span className="text-xs text-white/60">Sırala</span>
                                <EliteSelect
                                    value={sort}
                                    onChange={(v) => setSort(v as SortKey)}
                                    ariaLabel="Sıralama"
                                    options={[
                                        { value: 'recent', label: 'Yeni → Eski' },
                                        { value: 'alpha', label: 'A–Z' },
                                    ]}
                                    className="min-w-[220px]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block text-right text-xs text-white/55 pt-2">
                    Toplam <b className="text-white tabular-nums">{total}</b> turnuva
                </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => (
                    <PublicTournamentCard
                        key={t.id}
                        tournament={t}
                        accent={pickAccent(`t:${t.public_slug || t.id}`)}
                    />
                ))}
            </section>
        </div>
    );
}

/* =========================================================================
   ALT BİLEŞENLER
   ========================================================================= */

function HeaderBar({
    sort, setSort, q, setQ, total, subdued = false, title = 'Ana Turnuvalar'
}: {
    sort: SortKey;
    setSort: (s: SortKey) => void;
    q: string;
    setQ: (s: string) => void;
    total: number;
    subdued?: boolean;
    title?: string;
}) {
    return (
        <div className="py-4 sm:py-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold leading-tight truncate">
                        {title}
                    </h2>
                    <p className={`mt-0.5 text-xs sm:text-sm ${subdued ? 'text-slate-400' : 'text-slate-300'}`}>
                        Toplam <b>{total}</b> kayıt
                    </p>
                </div>

                {/* Sıralama: sm ve üstü sağda, mobilde aşaÄŸıda ayrı satırda */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className="text-sm text-slate-300">SIRALA:</span>
                    <EliteSelect
                        value={sort}
                        onChange={(v) => setSort(v as SortKey)}
                        ariaLabel="Sıralama"
                        options={[
                            { value: 'recent', label: 'Zamana göre (Yeni → Eski)' },
                            { value: 'alpha', label: 'Alfabetik (A–Z)' },
                        ]}
                        className="min-w-[220px]"
                    />
                </div>
            </div>

            {/* Alt satır: arama (full width) + (mobil) sıralama */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Arama: mobilde tam genişlik, sm'de sabit genişlik */}
                <div className="relative w-full sm:max-w-xs">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Hızlı ara (başlık)…"
                        className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded text-sm placeholder:text-slate-400 focus:border-premium-accent/50 focus:outline-none transition-colors"
                        aria-label="Turnuva ara"
                    />
                    {q && (
                        <button
                            onClick={() => setQ('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-200"
                            aria-label="Aramayı temizle"
                            title="Temizle"
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Mobil sıralama kontrolü */}
                <div className="flex items-center gap-2 sm:hidden">
                    <span className="text-xs text-slate-300">SIRALA:</span>
                    <EliteSelect
                        value={sort}
                        onChange={(v) => setSort(v as SortKey)}
                        ariaLabel="Sıralama"
                        options={[
                            { value: 'recent', label: 'Zamana göre (Yeni → Eski)' },
                            { value: 'alpha', label: 'Alfabetik (A–Z)' },
                        ]}
                        className="flex-1 w-full"
                        menuClassName="min-w-[220px]"
                    />
                </div>
            </div>
        </div>
    );
}

function PublicTournamentCard({
    tournament,
    accent,
}: {
    tournament: Tournament;
    accent: {
        border: string;
        chip: string;
        glow: string;
        header: string;
        name: string;
    };
}) {
    const navigate = useNavigate();

    const dateRange =
        tournament.start_date && tournament.end_date
            ? formatDateRange(tournament.start_date, tournament.end_date)
            : null;

    const goToSubList = () =>
        navigate(`/tournements/${tournament.public_slug}?parent=${tournament.id}`);

    return (
        <button
            type="button"
            onClick={goToSubList}
            className={[
                'group relative overflow-hidden text-left rounded-[26px] border bg-white/[0.03] backdrop-blur-xl shadow-elite',
                'hover:bg-white/[0.05] transition-all',
                accent.border,
            ].join(' ')}
            title={tournament.title}
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br ${accent.glow} blur-[70px] opacity-80`} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />
            </div>

            <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${accent.chip}`}>
                                Public
                            </span>
                            {tournament.city ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/10 bg-black/20 text-[11px] text-white/70">
                                    {tournament.city}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-3 text-base font-semibold text-white truncate">
                            {tournament.title}
                        </div>
                        <div className="mt-1 text-xs text-white/55 truncate">
                            {dateRange ?? 'Tarih bilgisi yok'}
                        </div>
                    </div>

                    <div className="shrink-0 w-11 h-11 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
                        <span className="text-white/70 group-hover:text-white transition-colors">↗</span>
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/55">
                        <span className="inline-flex items-center gap-2">
                            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-white/25" aria-hidden />
                            Alt turnuvaları görüntüle
                        </span>
                    </div>
                    <div className="text-xs text-white/60 group-hover:text-white transition-colors">
                        Görüntüle →
                    </div>
                </div>
            </div>
        </button>
    );
}

function PrivateCard({
    tournament,
    onChanged,
}: {
    tournament: Tournament;
    onChanged: () => void;
}) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);
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
            className="group w-[260px] h-[260px] rounded-2xl mx-auto
                 bg-[#0b0f16] border border-white/10 shadow-xl shadow-black/50 relative overflow-hidden cursor-pointer"
            title={tournament.title}
        >
            {/* Elite arka plan (subtle) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.10),transparent_60%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f16] via-[#0d1117] to-[#0a0c10] opacity-90" />

            {/* ÜST BAR (3 nokta + şehir) */}
            <div className="absolute top-0 left-0 right-0 p-2 flex items-start justify-between text-[11px] pointer-events-none">
                <div className="relative z-20 pointer-events-auto" ref={menuRef}>
                    {canEdit && (
                        <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1c1f26] border border-white/15 text-slate-300 hover:text-white hover:bg-[#252830] transition-colors"
                            title="Seçenekler"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            type="button"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
                        </button>
                    )}

                    {menuOpen && canEdit && (
                        <div
                            role="menu"
                            className="absolute left-0 mt-2 w-52 bg-[#1a1d24] border border-white/10 rounded-xl overflow-hidden z-30 shadow-xl"
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
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                                type="button"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Düzenle
                            </button>

                            <button
                                role="menuitem"
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setMenuOpen(false);
                                    setConfirmOpen(true);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
                                type="button"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Sil
                            </button>
                        </div>
                    )}
                </div>

                {tournament.city && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-900/40 border border-white/10 text-slate-200 self-center pointer-events-auto">
                        {tournament.city}
                    </span>
                )}
            </div>

            {/* ORTA: Turnuvaist Taekwondo dairesel emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -translate-y-5">
                {logoError ? (
                    <TurnuvaEmblem variant="main" size={240} className="relative z-10 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]" />
                ) : (
                    <img
                        src="/turnuvaist-taekwondo.png"
                        alt="Turnuvaist Taekwondo"
                        width={320}
                        height={320}
                        loading="lazy"
                        className="relative z-10 w-[320px] h-[320px] object-contain rounded-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
                        onError={() => setLogoError(true)}
                    />
                )}
            </div>

            {/* ALT BANT: Başlık + Tarih */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent">
                <div className="px-3 pt-10 pb-2 text-center text-white font-semibold truncate">
                    {tournament.title}
                </div>
                <div className="px-3 pb-3 text-center text-xs text-white/70 truncate">
                    {dateRange ?? 'Tarih bilgisi yok'}
                </div>
            </div>

            <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-emerald-300/50 rounded-2xl transition pointer-events-none" />

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
                        <p className="text-sm text-slate-300">
                            {'"'}{tournament.title}{'"'}  geri alınamaz şekilde silinecek.
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
                    className="w-[260px] h-[240px] rounded-xl mx-auto bg-gradient-to-br from-[#0f1419] via-[#151b23] to-[#0d1117] border border-white/10 relative overflow-hidden"
                >
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/30" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ isAdmin = false }: { isAdmin?: boolean }) {
    return (
        <div className="mt-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 via-teal-400/15 to-emerald-500/20 border border-cyan-400/30 flex items-center justify-center mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-emerald-400/10 blur-xl" />
                <svg width="44" height="44" viewBox="0 0 64 64" className="relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" fill="none">
                    <defs>
                        <linearGradient id="emptyIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                    </defs>
                    <path d="M16 8h32l2 12a16 16 0 0 1-12 15V44h8v8H18v-8h8V35a16 16 0 0 1-12-15l2-12z" fill="url(#emptyIconGradient)" />
                    <rect x="24" y="48" width="16" height="4" rx="2" fill="url(#emptyIconGradient)" />
                </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Henüz ana turnuva yok
            </h3>
            <p className="text-sm text-slate-400 mb-6">
                Bir ana turnuva oluşturmak ister misiniz?
            </p>
            {isAdmin && (
                <Link
                    to="/create?mode=main"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-premium-accent to-indigo-600 hover:from-indigo-600 hover:to-premium-accent text-white font-semibold shadow-neon transition-all duration-300 hover:scale-105"
                >
                    <span>✨</span>
                    Turnuva Oluştur
                </Link>
            )}
        </div>
    );
}

/* Basit tarih aralıÄŸı formatlayıcı (YYYY-MM-DD â†’ DD.MM.YYYY "“ DD.MM.YYYY) */
function formatDateRange(a: string, b: string) {
    try {
        const aa = new Date(a);
        const bb = new Date(b);
        const f = (d: Date) =>
            `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        return `${f(aa)} "“ ${f(bb)}`;
    } catch {
        return null;
    }
}
