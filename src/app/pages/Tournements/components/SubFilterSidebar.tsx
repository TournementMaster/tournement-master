export type SubFilters = {
    status: 'all' | 'pending' | 'in_progress' | 'completed';
    gender: 'all' | 'M' | 'F';
    ageMin: string;   // boş string → sınır yok
    ageMax: string;
    weightMin: string;
    weightMax: string;
};

const DEFAULTS: SubFilters = {
    status: 'all',
    gender: 'all',
    ageMin: '',
    ageMax: '',
    weightMin: '',
    weightMax: '',
};

export default function SubFilterSidebar({
                                             filters,
                                             setFilters,
                                         }: {
    filters: SubFilters;
    setFilters: (f: SubFilters) => void;
}) {
    const set = (patch: Partial<SubFilters>) => setFilters({ ...filters, ...patch });
    const clear = () => setFilters({ ...DEFAULTS });

    return (
        <aside className="w-64 bg-[#2d3038] rounded-lg p-4 h-fit sticky top-6">
            <nav className="space-y-6">
                {/* DURUM */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">DURUM</h3>
                    {([
                        ['all', 'Tümü'],
                        ['pending', 'Başlamayan'],
                        ['in_progress', 'Devam eden'],
                        ['completed', 'Biten'],
                    ] as const).map(([k, lbl]) => (
                        <button
                            key={k}
                            className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.status===k?'bg-gray-700':''}`}
                            onClick={() => set({ status: k })}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* CİNSİYET */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">CİNSİYET</h3>
                    {([
                        ['all', 'Tümü'],
                        ['M', 'Erkek'],
                        ['F', 'Kadın'],
                    ] as const).map(([k, lbl]) => (
                        <button
                            key={k}
                            className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.gender===k?'bg-gray-700':''}`}
                            onClick={() => set({ gender: k as SubFilters['gender'] })}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* YAŞ (min–max) */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">YAŞ ARALIĞI</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={filters.ageMin}
                            onChange={(e)=>set({ ageMin: e.target.value.replace(/\D/g,'').slice(0,2) })}
                            placeholder="Min"
                            inputMode="numeric"
                            className="bg-gray-700 px-2 py-2 rounded text-sm"
                        />
                        <input
                            value={filters.ageMax}
                            onChange={(e)=>set({ ageMax: e.target.value.replace(/\D/g,'').slice(0,2) })}
                            placeholder="Max"
                            inputMode="numeric"
                            className="bg-gray-700 px-2 py-2 rounded text-sm"
                        />
                    </div>
                </div>

                {/* KİLO (min–max) */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">KİLO ARALIĞI (kg)</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={filters.weightMin}
                            onChange={(e)=>set({ weightMin: e.target.value.replace(/[^\d.,]/g,'').replace(',', '.').slice(0,5) })}
                            placeholder="Min"
                            inputMode="decimal"
                            className="bg-gray-700 px-2 py-2 rounded text-sm"
                        />
                        <input
                            value={filters.weightMax}
                            onChange={(e)=>set({ weightMax: e.target.value.replace(/[^\d.,]/g,'').replace(',', '.').slice(0,5) })}
                            placeholder="Max"
                            inputMode="decimal"
                            className="bg-gray-700 px-2 py-2 rounded text-sm"
                        />
                    </div>
                </div>

                {/* TEMİZLE */}
                <div className="pt-2">
                    <button
                        onClick={clear}
                        className="w-full px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-sm"
                    >
                        Filtreyi Temizle
                    </button>
                </div>
            </nav>
        </aside>
    );
}
