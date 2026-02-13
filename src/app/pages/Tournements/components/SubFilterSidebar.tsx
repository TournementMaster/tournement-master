import { Link } from 'react-router-dom';
import { EliteSelect } from '../../../components/EliteSelect';

export type SubFilters = {
    status: 'all' | 'pending' | 'in_progress' | 'completed';
    gender: 'all' | 'M' | 'F';
    ageCategory: 'all' | 'kucukler' | 'minikler' | 'yildizlar' | 'gencler' | 'umitler' | 'buyukler';
    weightMin: string;
    weightMax: string;
};
const DEFAULTS: SubFilters = {
    status: 'all',
    gender: 'all',
    ageCategory: 'all',
    weightMin: '',
    weightMax: '',
};

const CAT_OPTIONS = [
    ['all', 'Tümü'],
    ['kucukler', 'Küçükler'],
    ['minikler', 'Minikler'],
    ['yildizlar', 'Yıldızlar'],
    ['gencler', 'Gençler'],
    ['umitler', 'Ümitler'],
    ['buyukler', 'Büyükler'],
] as const;


export default function SubFilterSidebar({
    filters,
    setFilters,
    slug,
}: {
    filters: SubFilters;
    setFilters: (f: SubFilters) => void;
    slug?: string;
}) {
    const set = (patch: Partial<SubFilters>) => setFilters({ ...filters, ...patch });
    const clear = () => setFilters({ ...DEFAULTS });

    return (
        // mobil: tam genişlik, büyük ekran: 16rem; sticky sadece lg+
        <div className="w-full lg:w-64 bg-[#1a1d24]/90 backdrop-blur-md border border-white/10 rounded-xl p-5 h-fit lg:sticky lg:top-6">
            <nav className="space-y-6">
                {/* DURUM */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Durum</h3>
                    {([
                        ['all', 'Tümü'],
                        ['pending', 'Başlamayan'],
                        ['in_progress', 'Devam eden'],
                        ['completed', 'Biten'],
                    ] as const).map(([k, lbl]) => (
                        <button
                            key={k}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.status === k
                                    ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                    : 'hover:bg-white/5 text-slate-300'
                                }`}
                            onClick={() => set({ status: k })}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* CİNSİYET */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Cinsiyet</h3>
                    {([
                        ['all', 'Tümü'],
                        ['M', 'Erkek'],
                        ['F', 'Kadın'],
                    ] as const).map(([k, lbl]) => (
                        <button
                            key={k}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.gender === k
                                    ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                    : 'hover:bg-white/5 text-slate-300'
                                }`}
                            onClick={() => set({ gender: k as SubFilters['gender'] })}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* YAŞ KATEGORİSİ */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Yaş kategorisi</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <EliteSelect
                            value={filters.ageCategory}
                            onChange={(v) => set({ ageCategory: v as SubFilters['ageCategory'] })}
                            ariaLabel="Yaş kategorisi"
                            options={CAT_OPTIONS.map(([k, lbl]) => ({ value: k, label: lbl }))}
                            className="w-full"
                        />
                    </div>
                </div>


                {/* KİLO */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Kilo aralığı (kg)</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={filters.weightMin}
                            onChange={(e) => set({ weightMin: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.').slice(0, 5) })}
                            placeholder="Min"
                            inputMode="decimal"
                            className="bg-[#0b0f16]/70 border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:border-premium-accent/50 focus:outline-none transition-colors"
                        />
                        <input
                            value={filters.weightMax}
                            onChange={(e) => set({ weightMax: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.').slice(0, 5) })}
                            placeholder="Max"
                            inputMode="decimal"
                            className="bg-[#0b0f16]/70 border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:border-premium-accent/50 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* TEMİZLE */}
                <div className="pt-2">
                    <button
                        onClick={clear}
                        className="w-full px-3 py-2 rounded-lg bg-[#0b0f16]/70 hover:bg-[#0b0f16] border border-white/10 text-sm font-medium text-slate-100 transition-colors"
                    >
                        Filtreyi Temizle
                    </button>
                </div>

                {/* Hızlı Erişim */}
                <div className="pt-4 space-y-3">
                    <Link
                        to={slug ? `/tournements/${encodeURIComponent(slug)}/leaderboard` : '#'}
                        className={`group w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                        bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-yellow-500/20
                        border border-amber-300/30 text-amber-200
                        hover:shadow-[0_0_0_2px_rgba(251,191,36,.35),0_0_18px_6px_rgba(251,191,36,.18)]
                        hover:border-amber-300/50 transition ${slug ? '' : 'pointer-events-none opacity-50'}`}
                        aria-label="Liderlik Tablosu"
                    >
                        <span className="text-lg">🏆</span>
                        <span className="font-medium text-[1.05rem]">Liderlik Tablosu</span>
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
                        <span className="font-medium text-[1.05rem]">Tartı Günü</span>
                    </Link>

                    <Link
                        to={slug ? `/live/${encodeURIComponent(slug)}` : '#'}
                        className={`group w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                        bg-gradient-to-r from-rose-600/25 via-red-500/20 to-red-600/25
                        border border-red-300/40 text-red-100
                        hover:shadow-[0_0_0_2px_rgba(248,113,113,.35),0_0_18px_6px_rgba(248,113,113,.18)]
                        hover:border-red-300/60 transition ${slug ? '' : 'pointer-events-none opacity-50'}`}
                        aria-label="Canlı Maç Odası"
                    >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor" />
                        </svg>
                        <span className="font-medium text-[1.05rem]">Canlı Maç Odası</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
