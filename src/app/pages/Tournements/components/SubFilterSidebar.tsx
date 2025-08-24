import { Link } from 'react-router-dom'

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
                                             slug,
                                         }: {
    filters: SubFilters;
    setFilters: (f: SubFilters) => void;
    /** Turnuva slug’ı: buton linkleri için opsiyonel */
    slug?: string;
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

                {/* ───────── Yeni: Hızlı Erişim Butonları ───────── */}
                <div className="pt-4 space-y-3">
                    <Link
                        to={slug ? `/tournements/${encodeURIComponent(slug)}/leaderboard` : '#'}
                        className={`group w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                        bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-yellow-500/20
                        border border-amber-300/30 text-amber-200
                        hover:shadow-[0_0_0_2px_rgba(251,191,36,.35),0_0_18px_6px_rgba(251,191,36,.18)]
                        hover:border-amber-300/50 transition ${slug ? '' : 'pointer-events-none opacity-50'}`}
                        aria-label="Leaderboard"
                    >
                        <span className="text-lg">🏆</span>
                        <span className="font-medium">Leaderboard</span>
                    </Link>

                    <Link
                        to={slug ? `/weigh/${encodeURIComponent(slug)}` : '#'}
                        className={`group w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                        bg-gradient-to-r from-violet-600/20 via-indigo-500/15 to-blue-600/20
                        border border-violet-300/30 text-violet-200
                        hover:shadow-[0_0_0_2px_rgba(167,139,250,.35),0_0_18px_6px_rgba(99,102,241,.18)]
                        hover:border-violet-300/50 transition ${slug ? '' : 'pointer-events-none opacity-50'}`}
                        aria-label="Tartı Günü"
                    >
                        <span className="text-lg">⚖️</span>
                        <span className="font-medium">Tartı Günü</span>
                    </Link>
                </div>
            </nav>
        </aside>
    );
}
