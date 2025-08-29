// src/app/pages/Tournements/LeaderboardPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';

type ApiLeaderboardItem = {
    sub_tournament: string;
    title: string;
    gender?: 'M' | 'F' | string;
    age_min?: number | null;
    age_max?: number | null;
    weight_min?: string | null;
    weight_max?: string | null;
    top8: { rank: number; first_name: string; club_name: string | null }[];
};

type Top8Row = {
    sub_slug: string;
    sub_title: string;
    gender?: 'M' | 'F' | 'O' | string;
    age?: string;
    weight?: string;
    athletes: { name: string; club?: string; rank: number }[];
};

type TeamRow = { clubId: number; club: string; played: number; won: number };

type MatchDTO = { athlete1: number | null; athlete2: number | null; winner: number | null };
type AthleteDTO = { id: number; club: number | null; club_name?: string | null };
type SubItem = { public_slug: string; title: string };

const gLabel = (g?: string) => (g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : 'Karma');

const fmtRange = (lo?: number | string | null, hi?: number | string | null, unit = '') => {
    const L = (lo ?? '').toString().trim();
    const H = (hi ?? '').toString().trim();
    if (!L && !H) return undefined;
    const left = L ? String(L).replace(/\.0+$/, '') : '–';
    const right = H ? String(H).replace(/\.0+$/, '') : '–';
    return unit ? `${left}–${right} ${unit}` : `${left}–${right}`;
};

const normalize = (it: ApiLeaderboardItem): Top8Row => ({
    sub_slug: it.sub_tournament,
    sub_title: it.title,
    gender: it.gender,
    age: fmtRange(it.age_min ?? '', it.age_max ?? ''),
    weight: fmtRange(it.weight_min ?? '', it.weight_max ?? '', 'kg'),
    athletes: (it.top8 ?? []).map((a) => ({
        rank: a.rank,
        name: a.first_name,
        club: a.club_name || undefined,
    })),
});

// Türkçe büyük harfe çevirme (i → İ vb.)
const toTRUpper = (s: string | undefined | null) => (s ?? '').toLocaleUpperCase('tr-TR');

/* ---------------------------
   BACKEND çağrıları
----------------------------*/
async function fetchMatchesForSub(subPublicSlug: string): Promise<MatchDTO[]> {
    // DRF action: /api/subtournaments/<slug>/matches/
    const r = await api.get(`subtournaments/${subPublicSlug}/matches/`);
    return Array.isArray(r.data) ? r.data : [];
}

async function fetchAthletesForSub(subPublicSlug: string): Promise<AthleteDTO[]> {
    // DRF action: /api/subtournaments/<slug>/athletes/
    const r = await api.get(`subtournaments/${subPublicSlug}/athletes/`);
    return Array.isArray(r.data) ? r.data : [];
}

async function fetchSubsForTournament(tournamentSlug: string): Promise<SubItem[]> {
    // /api/tournaments/<slug>/subtournaments/
    const r = await api.get(`tournaments/${tournamentSlug}/subtournaments/`);
    const data = Array.isArray(r.data) ? r.data : [];
    return data.map((d: any) => ({ public_slug: d.public_slug, title: d.title }));
}

/* ---------------------------
   Kulüp bazında istatistik
----------------------------*/
const winRatio = (won: number, played: number) => (played > 0 ? won / played : 0);
const sortByRatio = (rows: TeamRow[]) =>
    rows.sort((a, b) => {
        const rb = winRatio(b.won, b.played);
        const ra = winRatio(a.won, a.played);
        if (rb !== ra) return rb - ra;
        if (b.won !== a.won) return b.won - a.won;
        if (b.played !== a.played) return b.played - a.played;
        return a.club.localeCompare(b.club);
    });

function calcTeamStats(matches: MatchDTO[], athletes: AthleteDTO[]): TeamRow[] {
    // athlete.id -> clubId & clubId -> clubName
    const clubIdByAthlete = new Map<number, number>();
    const clubNameById = new Map<number, string>();

    for (const a of athletes) {
        if (a.club != null) {
            clubIdByAthlete.set(a.id, a.club);
            const nm = (a.club_name ?? '').toString().trim();
            if (nm) clubNameById.set(a.club, nm);
        }
    }

    const rows = new Map<number, TeamRow>();
    const push = (clubId: number, dp: number, dw: number) => {
        const existing = rows.get(clubId) || {
            clubId,
            club: clubNameById.get(clubId) || `Kulüp #${clubId}`,
            played: 0,
            won: 0,
        };
        existing.played += dp;
        existing.won += dw;
        // isim sonradan gelirse güncelle
        const nm = clubNameById.get(clubId);
        if (nm) existing.club = nm;
        rows.set(clubId, existing);
    };

    for (const m of matches) {
        const a1 = m.athlete1 ?? null;
        const a2 = m.athlete2 ?? null;
        const w = m.winner ?? null;

        if (a1 != null && clubIdByAthlete.has(a1)) {
            const c1 = clubIdByAthlete.get(a1)!;
            push(c1, 1, w != null && a1 === w ? 1 : 0);
        }
        if (a2 != null && clubIdByAthlete.has(a2)) {
            const c2 = clubIdByAthlete.get(a2)!;
            push(c2, 1, w != null && a2 === w ? 1 : 0);
        }
    }

    const out = Array.from(rows.values());
    return sortByRatio(out);
}

/* ---------------------------
   İNDİR (PNG) yardımcıları
----------------------------*/
const safeFile = (name: string, suffix: string) => {
    const base = (name || 'siralama')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._ -]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    return `${base}_${suffix}.png`;
};

const downloadElementAsPNG = async (el: HTMLElement, filename: string) => {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0b0f16', // koyu arka planla aynı ton (UI ile tutarlı)
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
};

type TabKey = 'oyuncu' | 'siklet' | 'genel';

export default function LeaderboardPage() {
    const { public_slug } = useParams();
    const [items, setItems] = useState<Top8Row[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Sidebar sekmesi ve seçili alt turnuva
    const [tab, setTab] = useState<TabKey>('oyuncu');
    const [selSub, setSelSub] = useState<string | null>(null);

    // Turnuvadaki tüm alt turnuvalar (genel/siklet için)
    const [subs, setSubs] = useState<SubItem[]>([]);

    // Siklet takım state
    const [weightTeamLoading, setWeightTeamLoading] = useState(false);
    const [weightTeamRows, setWeightTeamRows] = useState<TeamRow[] | null>(null);

    // Genel takım state
    const [generalLoading, setGeneralLoading] = useState(false);
    const [generalRows, setGeneralRows] = useState<TeamRow[] | null>(null);

    // İndirilecek alan referansları
    const cardsGridRef = useRef<HTMLDivElement>(null);
    const weightBoxRef = useRef<HTMLDivElement>(null);
    const generalBoxRef = useRef<HTMLDivElement>(null);

    /* --- Top8 verisini yükle (oyuncu sıralaması) --- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const res = await api.get<ApiLeaderboardItem[]>(`tournaments/${public_slug}/top8/`);
                let data: ApiLeaderboardItem[] = Array.isArray(res.data) ? res.data : [];
                if (!data.length) {
                    try {
                        const alt = await api.get<ApiLeaderboardItem[]>(`leaderboard/${public_slug}/top8/`);
                        data = Array.isArray(alt.data) ? alt.data : [];
                    } catch (e: any) {
                        const code = e?.response?.status;
                        if (!cancelled && code === 401)
                            setErr('Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.');
                    }
                }
                if (!cancelled) {
                    const norm = data.map(normalize);
                    setItems(norm);
                    if (norm.length && !selSub) setSelSub(norm[0].sub_slug);
                }
            } catch (e: any) {
                if (!cancelled) {
                    const code = e?.response?.status;
                    setErr(
                        code === 401
                            ? 'Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.'
                            : 'Leaderboard verisi alınamadı.'
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [public_slug]);

    /* --- Turnuvadaki alt turnuvaları yükle --- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await fetchSubsForTournament(public_slug!);
                if (!cancelled) {
                    setSubs(list);
                    if (!selSub && list.length) setSelSub(list[0].public_slug);
                }
            } catch {
                /* public olmayan turnuva olabilir */
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [public_slug]);

    /* --- Siklet takım sıralaması (tek alt turnuva) --- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (tab !== 'siklet' || !selSub) return;
            setWeightTeamLoading(true);
            setWeightTeamRows(null);
            try {
                const [matches, athletes] = await Promise.all([
                    fetchMatchesForSub(selSub),
                    fetchAthletesForSub(selSub),
                ]);
                if (!cancelled) setWeightTeamRows(calcTeamStats(matches, athletes));
            } catch (e: any) {
                if (!cancelled) {
                    const code = e?.response?.status;
                    setErr(
                        code === 401
                            ? 'Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.'
                            : 'Siklet takım verisi alınamadı.'
                    );
                }
            } finally {
                if (!cancelled) setWeightTeamLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tab, selSub]);

    /* --- Genel takım sıralaması (tüm alt turnuvalar) --- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (tab !== 'genel') return;
            setGeneralLoading(true);
            setGeneralRows(null);
            try {
                const subSlugs = (subs.length ? subs.map((s) => s.public_slug) : items.map((i) => i.sub_slug)).filter(Boolean);

                const perSub = await Promise.all(
                    subSlugs.map(async (slug) => {
                        try {
                            const [m, a] = await Promise.all([fetchMatchesForSub(slug), fetchAthletesForSub(slug)]);
                            return calcTeamStats(m, a);
                        } catch {
                            return [] as TeamRow[];
                        }
                    })
                );
                if (cancelled) return;

                // clubId ile birleştir
                const agg = new Map<number, TeamRow>();
                for (const arr of perSub) {
                    for (const r of arr) {
                        const cur = agg.get(r.clubId);
                        if (!cur) {
                            agg.set(r.clubId, { ...r });
                        } else {
                            cur.played += r.played;
                            cur.won += r.won;
                            if (r.club && r.club !== cur.club) cur.club = r.club;
                        }
                    }
                }
                const rows = sortByRatio(Array.from(agg.values()));
                setGeneralRows(rows);
            } catch (e: any) {
                const code = e?.response?.status;
                setErr(
                    code === 401
                        ? 'Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.'
                        : 'Genel takım verisi alınamadı.'
                );
            } finally {
                if (!cancelled) setGeneralLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tab, subs, items]);

    const subOptions = useMemo(() => {
        if (subs.length) return subs.map((s) => ({ value: s.public_slug, label: s.title }));
        return items.map((i) => ({ value: i.sub_slug, label: i.sub_title }));
    }, [subs, items]);

    const selSubTitle = useMemo(
        () => subOptions.find((o) => o.value === (selSub ?? ''))?.label ?? '',
        [subOptions, selSub]
    );

    // İNDİR handler’ları
    const handleDownloadCard = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const card = (e.currentTarget as HTMLElement).closest('article') as HTMLElement | null;
        if (card) {
            const title = (card.getAttribute('data-title') || 'ilk8').toString();
            await downloadElementAsPNG(card, safeFile(title, 'ilk8'));
        }
    };
    const handleDownloadAllCards = async () => {
        if (cardsGridRef.current) {
            await downloadElementAsPNG(cardsGridRef.current, safeFile(selSubTitle || 'tum_alt_tur', 'ilk8_toplu'));
        }
    };
    const handleDownloadWeight = async () => {
        if (weightBoxRef.current) {
            await downloadElementAsPNG(weightBoxRef.current, safeFile(selSubTitle || 'siklet', 'takim'));
        }
    };
    const handleDownloadGeneral = async () => {
        if (generalBoxRef.current) {
            await downloadElementAsPNG(generalBoxRef.current, safeFile('genel', 'takim'));
        }
    };

    if (loading)
        return <div className="max-w-6xl mx-auto py-10 text-white subpixel-antialiased text-xl">Yükleniyor…</div>;
    if (err)
        return (
            <div className="max-w-6xl mx-auto py-10 subpixel-antialiased">
                <div className="rounded-2xl border border-red-400/40 bg-red-600/15 text-red-100 p-6 text-lg leading-relaxed">
                    {err}
                </div>
                <div className="mt-4 flex items-center gap-6">
                    <Link to={`/tournements/${public_slug}`} className="text-lg text-blue-300 hover:underline">
                        ← Alt Turnuvalar
                    </Link>
                    {err.includes('Yetki yok') && (
                        <Link
                            to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                            className="text-lg text-blue-300 hover:underline"
                        >
                            Giriş Yap →
                        </Link>
                    )}
                </div>
            </div>
        );

    return (
        <div className="max-w-7xl mx-auto py-8 space-y-8 subpixel-antialiased">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">Liderlik Tablosu – İlk 8</h1>
                <Link to={`/tournements/${public_slug}`} className="text-lg text-blue-300 hover:underline">
                    ← Alt Turnuvalar
                </Link>
            </div>

            {/* Oyuncu sekmesindeyken hepsini indir */}
            {tab === 'oyuncu' && (
                <div className="mt-2 flex justify-end">
                    <button
                        onClick={handleDownloadAllCards}
                        className="px-3 py-2 rounded-xl text-sm font-semibold
                       border border-emerald-400/30 bg-emerald-500/15 text-emerald-100
                       hover:bg-emerald-500/25 hover:border-emerald-400/50 transition"
                    >
                        Tüm İlk 8’i İndir
                    </button>
                </div>
            )}

            <div className="flex gap-6">
                {/* Sidebar */}
                <aside className="hidden md:block w-72 shrink-0">
                    <div className="rounded-3xl border border-white/10 bg-[#121723]/95 overflow-hidden">
                        <div className="px-4 py-3 text-sm tracking-wide text-slate-300 border-b border-white/10">
                            Sıralama Görünümleri
                        </div>
                        <nav className="p-2">
                            <button
                                onClick={() => setTab('oyuncu')}
                                className={[
                                    'w-full text-left px-3 py-3 rounded-xl transition',
                                    tab === 'oyuncu'
                                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 shadow-[0_0_0_2px_rgba(16,185,129,.25)]'
                                        : 'text-slate-200 hover:bg-white/5 border border-transparent',
                                ].join(' ')}
                            >
                                Oyuncu sıralaması
                            </button>
                            <button
                                onClick={() => setTab('siklet')}
                                className={[
                                    'w-full text-left mt-2 px-3 py-3 rounded-xl transition',
                                    tab === 'siklet'
                                        ? 'bg-violet-500/15 text-violet-200 border border-violet-400/40 shadow-[0_0_0_2px_rgba(139,92,246,.25)]'
                                        : 'text-slate-200 hover:bg-white/5 border border-transparent',
                                ].join(' ')}
                            >
                                Siklet takım sıralaması
                            </button>
                            <button
                                onClick={() => setTab('genel')}
                                className={[
                                    'w-full text-left mt-2 px-3 py-3 rounded-xl transition',
                                    tab === 'genel'
                                        ? 'bg-amber-500/15 text-amber-200 border border-amber-400/40 shadow-[0_0_0_2px_rgba(245,158,11,.25)]'
                                        : 'text-slate-200 hover:bg-white/5 border border-transparent',
                                ].join(' ')}
                            >
                                Genel takım sıralaması
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* Mobil sekmeler */}
                <div className="md:hidden w-full">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setTab('oyuncu')}
                            className={['px-3 py-2 rounded-xl text-sm', tab === 'oyuncu' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-slate-200'].join(' ')}
                        >
                            Oyuncu
                        </button>
                        <button
                            onClick={() => setTab('siklet')}
                            className={['px-3 py-2 rounded-xl text-sm', tab === 'siklet' ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-slate-200'].join(' ')}
                        >
                            Siklet Takım
                        </button>
                        <button
                            onClick={() => setTab('genel')}
                            className={['px-3 py-2 rounded-xl text-sm', tab === 'genel' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/5 text-slate-200'].join(' ')}
                        >
                            Genel Takım
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <section className="flex-1 min-w-0">
                    {/* === OYUNCU SIRALAMASI === */}
                    {tab === 'oyuncu' && (
                        <>
                            {items.length === 0 ? (
                                <div className="rounded-2xl border border-white/15 p-8 text-lg text-gray-100">Liste boş.</div>
                            ) : (
                                <div ref={cardsGridRef} className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                                    {items.map((b) => (
                                        <article
                                            key={b.sub_slug}
                                            data-top8-card
                                            data-title={b.sub_title}
                                            className="group rounded-3xl border border-white/10 bg-[#1b1f27]/95
                                 hover:border-emerald-400/40 hover:shadow-[0_0_0_3px_rgba(16,185,129,.25)]
                                 transition"
                                        >
                                            {/* Header */}
                                            <div className="p-6 border-b border-white/10 flex items-start justify-between">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-white text-xl leading-snug">
                                                        <Link to={`/bracket/${b.sub_slug}`} className="hover:underline">
                                                            {b.sub_title}
                                                        </Link>
                                                    </h3>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-base">
                                                        {b.gender && (
                                                            <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">
                                {gLabel(b.gender)}
                              </span>
                                                        )}
                                                        {b.age && (
                                                            <span className="px-2 py-1 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/30">
                                Yaş {b.age}
                              </span>
                                                        )}
                                                        {b.weight && (
                                                            <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/30">
                                Kilo {b.weight}
                              </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Sağ: Bracket ve hemen altında İndir */}
                                                <div className="shrink-0 flex flex-col items-end gap-2">
                                                    <Link
                                                        to={`/bracket/${b.sub_slug}`}
                                                        className="px-3 py-1.5 text-lg rounded-xl border border-white/15 text-white
                                       bg-[#0f131a]/80 hover:bg-[#121722] transition"
                                                    >
                                                        Bracket →
                                                    </Link>
                                                    <button
                                                        onClick={handleDownloadCard}
                                                        className="px-3 py-1.5 rounded-xl
                                       border border-emerald-300/30 bg-emerald-500/10 text-emerald-200
                                       hover:bg-emerald-500/20 hover:border-emerald-300/50 text-sm"
                                                    >
                                                        İndir
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Top-8 */}
                                            <div className="px-4 pt-3 text-base tracking-wide text-slate-300">İLK 8</div>
                                            <ol className="p-4 pb-6 space-y-2">
                                                {b.athletes.slice(0, 8).map((a) => (
                                                    <li
                                                        key={`${b.sub_slug}-${a.rank}-${a.name}`}
                                                        className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/5 transition"
                                                    >
                                                        <div
                                                            className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300
                                         flex items-center justify-center font-extrabold text-xl"
                                                        >
                                                            {a.rank}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-xl font-semibold text-white truncate leading-snug">{a.name || '—'}</div>
                                                            <div className="text-lg text-slate-300 truncate leading-snug">{a.club || '—'}</div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ol>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* === SİKLET TAKIM SIRALAMASI (tek alt turnuva) === */}
                    {tab === 'siklet' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                <h2 className="text-xl font-bold text-violet-200">Siklet takım sıralaması</h2>
                                <div className="flex items-center gap-3">
                                    <label className="text-slate-300 text-sm">Alt turnuva:</label>
                                    <select
                                        value={selSub ?? ''}
                                        onChange={(e) => setSelSub(e.target.value || null)}
                                        className="bg-[#0f131a] border border-white/15 rounded-xl px-3 py-2 text-slate-100"
                                    >
                                        {subOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Siklet indir */}
                                    <button
                                        onClick={handleDownloadWeight}
                                        className="px-3 py-2 rounded-xl text-sm font-semibold
                               border border-violet-400/30 bg-violet-500/15 text-violet-100
                               hover:bg-violet-500/25 hover:border-violet-400/50 transition"
                                    >
                                        İndir
                                    </button>
                                </div>
                            </div>

                            <div ref={weightBoxRef} className="rounded-2xl border border-white/10 overflow-hidden">
                                <div className="bg-[#10131a] px-4 py-3 text-slate-300 text-sm tracking-wide">
                                    Kulüp bazında toplam maç ve kazanılan maç sayısı
                                </div>
                                <div className="overflow-x-auto">
                                    {weightTeamLoading ? (
                                        <div className="p-6 text-slate-200">Yükleniyor…</div>
                                    ) : weightTeamRows && weightTeamRows.length ? (
                                        <table className="min-w-full text-left">
                                            <thead className="bg-white/5 text-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold w-20">Sıra</th>
                                                <th className="px-4 py-3 font-semibold">Kulüp</th>
                                                <th className="px-4 py-3 font-semibold">Maç (Toplam)</th>
                                                <th className="px-4 py-3 font-semibold">Kazanılan</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                            {weightTeamRows.map((r, idx) => (
                                                <tr key={`w-${r.clubId}`}>
                                                    <td className="px-4 py-3">
                              <span
                                  className="inline-flex w-10 h-10 items-center justify-center rounded-full
                                           bg-gradient-to-br from-amber-400 to-yellow-300
                                           text-[#0b0f16] font-extrabold text-lg
                                           shadow-[0_2px_12px_rgba(251,191,36,.25)] ring-1 ring-white/10"
                              >
                                {idx + 1}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                              <span className="text-lg md:text-xl font-semibold tracking-wide text-indigo-200">
                                {toTRUpper(r.club)}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-200">{r.played}</td>
                                                    <td className="px-4 py-3 text-emerald-300">{r.won}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-6 text-slate-200">Veri bulunamadı.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === GENEL TAKIM SIRALAMASI (tüm alt turnuvalar) === */}
                    {tab === 'genel' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-amber-200">Genel takım sıralaması</h2>
                                <button
                                    onClick={handleDownloadGeneral}
                                    className="px-3 py-2 rounded-xl text-sm font-semibold
                             border border-amber-400/30 bg-amber-500/15 text-amber-100
                             hover:bg-amber-500/25 hover:border-amber-400/50 transition"
                                >
                                    İndir
                                </button>
                            </div>

                            <div ref={generalBoxRef} className="rounded-2xl border border-white/10 overflow-hidden">
                                <div className="bg-[#10131a] px-4 py-3 text-slate-300 text-sm tracking-wide">
                                    Bu turnuvadaki tüm alt turnuvalar üzerinden kulüp toplamları
                                </div>
                                <div className="overflow-x-auto">
                                    {generalLoading ? (
                                        <div className="p-6 text-slate-200">Yükleniyor…</div>
                                    ) : generalRows && generalRows.length ? (
                                        <table className="min-w-full text-left">
                                            <thead className="bg-white/5 text-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold w-20">Sıra</th>
                                                <th className="px-4 py-3 font-semibold">Kulüp</th>
                                                <th className="px-4 py-3 font-semibold">Maç (Toplam)</th>
                                                <th className="px-4 py-3 font-semibold">Kazanılan</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                            {generalRows.map((r, idx) => (
                                                <tr key={`g-${r.clubId}`}>
                                                    <td className="px-4 py-3">
                              <span
                                  className="inline-flex w-10 h-10 items-center justify-center rounded-full
                                           bg-gradient-to-br from-amber-400 to-yellow-300
                                           text-[#0b0f16] font-extrabold text-lg
                                           shadow-[0_2px_12px_rgba(251,191,36,.25)] ring-1 ring-white/10"
                              >
                                {idx + 1}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                              <span className="text-lg md:text-xl font-semibold tracking-wide text-indigo-200">
                                {toTRUpper(r.club)}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-200">{r.played}</td>
                                                    <td className="px-4 py-3 text-emerald-300">{r.won}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-6 text-slate-200">Veri bulunamadı.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
