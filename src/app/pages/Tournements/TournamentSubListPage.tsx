import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubTournaments } from '../../hooks/useSubTournaments';
import SubTournamentRow from './components/SubTournamentRow';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';

type SortKey = 'alpha' | 'created' | 'age' | 'weight';

function parseNum(x: unknown, def = NaN) {
    const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x);
    return Number.isFinite(n) ? n : def;
}

export default function TournamentSubListPage() {
    const { public_slug } = useParams<{ public_slug: string }>();
    const { data, isLoading, isError, error, refetch } = useSubTournaments(public_slug);

    const [filters, setFilters] = useState<SubFilters>({
        status: 'all',
        gender: 'all',
        ageMin: '',
        ageMax: '',
        weightMin: '',
        weightMax: '',
    });
    const [sort, setSort] = useState<SortKey>('alpha');
    const [q, setQ] = useState('');

    const list = useMemo(() => {
        const base = (data ?? []).filter(s =>
            !q ? true : s.title.toLowerCase().includes(q.toLowerCase())
        );

        // status (şimdilik veri yoksa etkisiz)
        const byStatus = base; // ileride s.status karşılaştır

        // gender
        const byGender = byStatus.filter(s =>
            filters.gender === 'all' ? true : (String(s.gender || '').toUpperCase() === filters.gender)
        );

        // age min–max
        const amin = filters.ageMin ? parseInt(filters.ageMin, 10) : -Infinity;
        const amax = filters.ageMax ? parseInt(filters.ageMax, 10) :  Infinity;
        const byAge = byGender.filter(s => {
            const lo = Number.isFinite(s.age_min as never) ? Number(s.age_min) : -Infinity;
            const hi = Number.isFinite(s.age_max as never) ? Number(s.age_max) :  Infinity;
            // aralıklarla kesişim var mı?
            return !(hi < amin || lo > amax);
        });

        // weight min–max
        const wmin = filters.weightMin ? parseNum(filters.weightMin, -Infinity) : -Infinity;
        const wmax = filters.weightMax ? parseNum(filters.weightMax,  Infinity) :  Infinity;
        const byWeight = byAge.filter(s => {
            const lo = parseNum(s.weight_min, -Infinity);
            const hi = parseNum(s.weight_max,  Infinity);
            return !(hi < wmin || lo > wmax);
        });

        const arr = [...byWeight];

        // sıralama
        arr.sort((a, b) => {
            switch (sort) {
                case 'alpha':
                    return a.title.localeCompare(b.title, 'tr');
                case 'created':
                    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
                case 'age': {
                    const ax = Number(a.age_min ?? 0);
                    const bx = Number(b.age_min ?? 0);
                    return ax - bx || a.title.localeCompare(b.title, 'tr');
                }
                case 'weight': {
                    const aw = (parseNum(a.weight_min) + parseNum(a.weight_max)) / 2;
                    const bw = (parseNum(b.weight_min) + parseNum(b.weight_max)) / 2;
                    return (aw - bw) || a.title.localeCompare(b.title, 'tr');
                }
            }
        });

        return arr;
    }, [data, q, filters, sort]);

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

                            {/* sıralama */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">SIRALA:</span>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as SortKey)}
                                    className="bg-gray-700 px-2 py-2 rounded text-sm"
                                >
                                    <option value="alpha">Alfabetik (A–Z)</option>
                                    <option value="created">Oluşturma Tarihi (Yeni → Eski)</option>
                                    <option value="age">Yaşa göre (Min yaş ↑)</option>
                                    <option value="weight">Kiloya göre (Ortalama ↑)</option>
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
