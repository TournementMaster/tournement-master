import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

// API'den gelen ham kayıt
type ApiLeaderboardItem = {
    sub_tournament: string;
    title: string;
    gender?: 'M' | 'F' | string;
    age_min?: number | null;
    age_max?: number | null;
    weight_min?: string | null; // "23.00"
    weight_max?: string | null;
    top8: { rank: number; first_name: string; club_name: string | null }[];
};

// Ekranda kullanacağımız normalize tip
type Top8Row = {
    sub_slug: string;
    sub_title: string;
    gender?: 'M' | 'F' | 'O' | string;
    age?: string;    // "14–16"
    weight?: string; // "23–246 kg"
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
                // varsayılan endpoint
                const res = await api.get<ApiLeaderboardItem[]>(`tournaments/${public_slug}/top8/`);
                let data: ApiLeaderboardItem[] = Array.isArray(res.data) ? res.data : [];
                // alternatif yol (opsiyonel)
                if (!data.length) {
                    try {
                        const alt = await api.get<ApiLeaderboardItem[]>(`leaderboard/${public_slug}/top8/`);
                        data = Array.isArray(alt.data) ? alt.data : [];
                    } catch { /* empty */ }
                }
                if (!cancelled) setItems(data.map(normalize));
            } catch {
                if (!cancelled) setErr('Leaderboard verisi alınamadı.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [public_slug]);

    if (loading) return <div className="max-w-5xl mx-auto py-8 text-gray-200">Yükleniyor…</div>;
    if (err)      return <div className="max-w-5xl mx-auto py-8 text-red-300">{err}</div>;

    return (
        <div className="max-w-5xl mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Leaderboard – İlk 8</h1>
                <Link to={`/tournements/${public_slug}`} className="text-sm text-blue-300 hover:underline">← Alt Turnuvalar</Link>
            </div>

            {items.length === 0 ? (
                <div className="rounded border border-white/10 p-6 text-gray-300">Liste boş.</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((b) => (
                        <article
                            key={b.sub_slug}
                            className="group rounded-2xl border border-white/10 bg-[#1b1f27]/90 backdrop-blur
                 hover:border-emerald-400/40 hover:shadow-[0_0_0_2px_rgba(16,185,129,.25)]
                 transition"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-100">
                                        <Link to={`/bracket/${b.sub_slug}`} className="hover:underline">
                                            {b.sub_title}
                                        </Link>
                                    </h3>
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                        {b.gender && (
                                            <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
                {gLabel(b.gender)}
              </span>
                                        )}
                                        {b.age && (
                                            <span className="px-2 py-1 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/20">
                Yaş {b.age}
              </span>
                                        )}
                                        {b.weight && (
                                            <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/20">
                Kilo {b.weight}
              </span>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    to={`/bracket/${b.sub_slug}`}
                                    className="shrink-0 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/90
                     bg-[#0f131a]/70 hover:bg-[#121722] transition"
                                >
                                    Bracket →
                                </Link>
                            </div>

                            {/* Top-8 */}
                            <div className="px-2 pt-2 text-[11px] uppercase tracking-wider text-slate-400/80">Top 8</div>
                            <ol className="p-2 pb-3 space-y-1">
                                {b.athletes.slice(0, 8).map((a) => (
                                    <li
                                        key={`${b.sub_slug}-${a.rank}-${a.name}`}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition"
                                    >
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300
                            flex items-center justify-center font-semibold">
                                            {a.rank}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-slate-100 truncate">{a.name || '—'}</div>
                                            <div className="text-[11px] text-slate-400 truncate">{a.club || '—'}</div>
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
