// src/app/pages/Tournements/LeaderboardPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

const gLabel = (g?: string) => (g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : 'Karma');

const fmtRange = (lo?: number | string | null, hi?: number | string | null, unit = '') => {
    const L = (lo ?? '').toString().trim();
    const H = (hi ?? '').toString().trim();
    if (!L && !H) return undefined;
    const left  = L ? String(L).replace(/\.0+$/,'') : '–';
    const right = H ? String(H).replace(/\.0+$/,'') : '–';
    return unit ? `${left}–${right} ${unit}` : `${left}–${right}`;
};

const normalize = (it: ApiLeaderboardItem): Top8Row => ({
    sub_slug: it.sub_tournament,
    sub_title: it.title,
    gender: it.gender,
    age: fmtRange(it.age_min ?? '', it.age_max ?? ''),
    weight: fmtRange(it.weight_min ?? '', it.weight_max ?? '', 'kg'),
    athletes: (it.top8 ?? []).map(a => ({
        rank: a.rank,
        name: a.first_name,
        club: a.club_name || undefined,
    })),
});

export default function LeaderboardPage() {
    const { public_slug } = useParams();
    const [items, setItems] = useState<Top8Row[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true); setErr(null);
            try {
                const res = await api.get<ApiLeaderboardItem[]>(`tournaments/${public_slug}/top8/`);
                let data: ApiLeaderboardItem[] = Array.isArray(res.data) ? res.data : [];
                if (!data.length) {
                    try {
                        const alt = await api.get<ApiLeaderboardItem[]>(`leaderboard/${public_slug}/top8/`);
                        data = Array.isArray(alt.data) ? alt.data : [];
                    } catch (e: any) {
                        const code = e?.response?.status;
                        if (!cancelled && code === 401) setErr('Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.');
                    }
                }
                if (!cancelled) setItems(data.map(normalize));
            } catch (e: any) {
                if (!cancelled) {
                    const code = e?.response?.status;
                    setErr(code === 401 ? 'Yetki yok (401). Bu içeriği görüntülemek için giriş yapmalısınız.' : 'Leaderboard verisi alınamadı.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [public_slug]);

    if (loading) return <div className="max-w-6xl mx-auto py-10 text-white subpixel-antialiased text-xl">Yükleniyor…</div>;
    if (err)      return (
        <div className="max-w-6xl mx-auto py-10 subpixel-antialiased">
            <div className="rounded-2xl border border-red-400/40 bg-red-600/15 text-red-100 p-6 text-lg leading-relaxed">{err}</div>
            <div className="mt-4 flex items-center gap-6">
                <Link to={`/tournements/${public_slug}`} className="text-lg text-blue-300 hover:underline">← Alt Turnuvalar</Link>
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
                <Link to={`/tournements/${public_slug}`} className="text-lg text-blue-300 hover:underline">← Alt Turnuvalar</Link>
            </div>

            {items.length === 0 ? (
                <div className="rounded-2xl border border-white/15 p-8 text-lg text-gray-100">Liste boş.</div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((b) => (
                        <article
                            key={b.sub_slug}
                            className="group rounded-3xl border border-white/10 bg-[#1b1f27]/95
                                       hover:border-emerald-400/40 hover:shadow-[0_0_0_3px_rgba(16,185,129,.25)]
                                       transition"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-start justify-between">
                                <div>
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
                                <Link
                                    to={`/bracket/${b.sub_slug}`}
                                    className="shrink-0 px-3 py-1.5 text-lg rounded-xl border border-white/15 text-white
                                               bg-[#0f131a]/80 hover:bg-[#121722] transition"
                                >
                                    Bracket →
                                </Link>
                            </div>

                            {/* Top-8 */}
                            <div className="px-4 pt-3 text-base tracking-wide text-slate-300">İLK 8</div>
                            <ol className="p-4 pb-6 space-y-2">
                                {b.athletes.slice(0, 8).map((a) => (
                                    <li
                                        key={`${b.sub_slug}-${a.rank}-${a.name}`}
                                        className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/5 transition"
                                    >
                                        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300
                                                        flex items-center justify-center font-extrabold text-xl">
                                            {a.rank}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xl font-semibold text-white truncate leading-snug">
                                                {a.name || '—'}
                                            </div>
                                            <div className="text-lg text-slate-300 truncate leading-snug">
                                                {a.club || '—'}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
