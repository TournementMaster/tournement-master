import { useMemo, useState } from 'react';
import { useBrackets, type BracketSummary } from '../../hooks/useBracket';
import FilterSidebar, { type Filters } from './components/FilterSidebar';
import BracketCard from './components/BracketCard';

type SortKey = 'alpha' | 'recent' | 'progress';

export default function Dashboard() {
    const { data, isLoading } = useBrackets();

    const [filters, setFilters] = useState<Filters>({ status: 'all', type: 'all' });
    const [sort, setSort] = useState<SortKey>('alpha');

    const list = useMemo(() => {
        const src = data ?? [];
        const byFilters = src.filter(b => {
            const okS = filters.status === 'all' || b.status === filters.status;
            const okT = filters.type   === 'all' || b.type   === filters.type;
            return okS && okT;
        });

        const sorted = [...byFilters].sort((a, b) => {
            switch (sort) {
                case 'alpha':    return a.title.localeCompare(b.title);
                case 'recent':   return b.id - a.id;                // örnek: id → yeni eklenen
                case 'progress': return b.progress - a.progress;    // çoktan aza
            }
        });
        return sorted;
    }, [data, filters, sort]);

    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-gray-400">Yükleniyor…</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
            {/* Sol filtre menüsü */}
            <div className="order-2 lg:order-1">
                <FilterSidebar filters={filters} setFilters={setFilters} />
            </div>

            {/* İçerik */}
            <div className="order-1 lg:order-2">
                <div className="bg-[#2d3038] rounded-lg p-5 mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">All Brackets</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">SORT BY:</span>
                        <select
                            className="bg-gray-700 px-2 py-1 rounded text-sm"
                            value={sort}
                            onChange={e => setSort(e.target.value as SortKey)}
                        >
                            <option value="alpha">Alphabetical (A–Z)</option>
                            <option value="recent">Recently Added</option>
                            <option value="progress">Progress</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    {list.map((it: BracketSummary) => (
                        <BracketCard key={it.id} item={it} />
                    ))}

                    {/* Reklam alanı (placeholder) */}
                    <div className="bg-[#2d3038] rounded-lg p-0 overflow-hidden">
                        <div className="h-28 w-full bg-gray-700/60 flex items-center justify-center text-gray-300">
                            Ad Slot (Placeholder)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
