import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubTournaments } from '../../hooks/useSubTournaments';
import SubTournamentRow from './components/SubTournamentRow';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';

type SortKey = 'alpha';

export default function TournamentSubListPage() {
    const { public_slug } = useParams<{ public_slug: string }>();
    const { data, isLoading, isError, error, refetch } = useSubTournaments(public_slug);

    const [filters, setFilters] = useState<SubFilters>({
        status: 'all',   // Geleceğe hazır; veri yoksa etkisiz kalır
        gender: 'all',
        age: 'all',
        weight: 'all',
    });
    const [sort] = useState<SortKey>('alpha');
    const [q, setQ] = useState('');

    const list = useMemo(() => {
        const base = (data ?? []).filter(s =>
            !q ? true : s.title.toLowerCase().includes(q.toLowerCase())
        );

        // --- Gender ---
        const byGender = base.filter(s =>
            filters.gender === 'all' ? true : (s.gender?.toUpperCase() === filters.gender)
        );

        // --- Age group ---
        const ageRanges: Record<NonNullable<SubFilters['age']>, [number, number]> = {
            all: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
            U12: [0, 12],
            U14: [0, 14],
            U16: [0, 16],
            U18: [0, 18],
            '19+': [19, Number.POSITIVE_INFINITY],
        };
        const [amin, amax] = ageRanges[filters.age];
        const byAge = byGender.filter(s => {
            if (filters.age === 'all') return true;
            const lo = Number.isFinite(s.age_min) ? Number(s.age_min) : 0;
            const hi = Number.isFinite(s.age_max) ? Number(s.age_max) : 99;
            // Grupla örtüşüyor mu?
            return !(hi < amin || lo > amax);
        });

        // --- Weight group ---
        const W = Number.POSITIVE_INFINITY;
        const weightRanges: Record<NonNullable<SubFilters['weight']>, [number, number]> = {
            all: [-W, W],
            '≤40': [-W, 40],
            '40-50': [40, 50],
            '50-60': [50, 60],
            '60-70': [60, 70],
            '70+': [70, W],
        };
        const [wmin, wmax] = weightRanges[filters.weight];
        const byWeight = byAge.filter(s => {
            if (filters.weight === 'all') return true;
            const min = parseFloat(String(s.weight_min).replace(',', '.'));
            const max = parseFloat(String(s.weight_max).replace(',', '.'));
            const lo = isNaN(min) ? -W : min;
            const hi = isNaN(max) ?  W : max;
            return !(hi < wmin || lo > wmax);
        });

        const cloned = [...byWeight];
        cloned.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        return cloned;
    }, [data, q, sort, filters]);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex gap-6">
                <SubFilterSidebar filters={filters} setFilters={setFilters} />

                <div className="flex-1">
                    {/* üst bar */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
                        <div>
                            <h2 className="text-xl font-semibold">All Brackets</h2>
                            <p className="text-sm text-gray-400">Toplam <b>{data?.length ?? 0}</b> alt turnuva</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Hızlı ara (başlık)…"
                                    className="bg-gray-700/70 px-3 py-2 rounded text-sm w-56 placeholder:text-gray-300"
                                    aria-label="Alt turnuva ara"
                                />
                                {q && (
                                    <button
                                        onClick={() => setQ('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {/* sıralama tek seçenek: alfabetik */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">SIRALA:</span>
                                <select value={sort} onChange={() => {}} className="bg-gray-700 px-2 py-2 rounded text-sm" disabled>
                                    <option value="alpha">Alfabetik (A–Z)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* durumlar */}
                    {isLoading && <SkeletonList />}
                    {isError && (
                        <div className="mt-2 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6">
                            <p className="text-red-300 font-semibold mb-2">Veri alınamadı.</p>
                            <p className="text-sm text-gray-300 mb-4">
                                {error instanceof Error ? error.message : 'Bilinmeyen hata.'}
                            </p>
                            <button onClick={() => refetch()} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">
                                Tekrar Dene
                            </button>
                        </div>
                    )}

                    {!isLoading && !isError && (
                        <>
                            {!list.length ? (
                                <div className="rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
                                    <div className="text-lg font-semibold mb-2">Alt turnuva bulunamadı</div>
                                    <p className="text-sm text-gray-300">Seçilen filtrelerle eşleşen kayıt yok.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-8">
                                    {list.map((s) => <SubTournamentRow key={s.id} item={s} />)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// aynı SkeletonList...


function SkeletonList() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-20 rounded-lg bg-[#2a2d34] border border-white/5 relative overflow-hidden"
                >
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
            ))}
        </div>
    );
}
