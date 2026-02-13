import type { BracketStatus, BracketType } from '../../../hooks/useBracket';

export type Filters = {
    status: BracketStatus | 'all';
    type: BracketType | 'all';
};

interface Props {
    filters: Filters;
    setFilters: (f: Filters) => void;
}

const statusItems: { key: Filters['status']; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
];

const typeItems: { key: Filters['type']; label: string }[] = [
    { key: 'single', label: 'Single Elimination' },
    { key: 'double', label: 'Double Elimination' },
    { key: 'round_robin', label: 'Round Robin' },
    { key: 'group', label: 'Group Stage' },
];

export default function FilterSidebar({ filters, setFilters }: Props) {
    return (
        <aside className="w-64 bg-[#1a1d24]/90 backdrop-blur-md border border-white/10 rounded-xl p-5 h-fit sticky top-6 shadow-lg">
            <nav className="space-y-6">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Durum</h3>
                    <ul className="space-y-1">
                        <li>
                            <button
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.status === 'all'
                                        ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                        : 'hover:bg-white/5 text-slate-300'
                                    }`}
                                onClick={() => setFilters({ ...filters, status: 'all' })}
                            >
                                Tümü
                            </button>
                        </li>
                        {statusItems.map(s => (
                            <li key={s.key}>
                                <button
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.status === s.key
                                            ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                            : 'hover:bg-white/5 text-slate-300'
                                        }`}
                                    onClick={() => setFilters({ ...filters, status: s.key })}
                                >
                                    {s.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Tip</h3>
                    <ul className="space-y-1">
                        <li>
                            <button
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.type === 'all'
                                        ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                        : 'hover:bg-white/5 text-slate-300'
                                    }`}
                                onClick={() => setFilters({ ...filters, type: 'all' })}
                            >
                                Tümü
                            </button>
                        </li>
                        {typeItems.map(t => (
                            <li key={t.key}>
                                <button
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.type === t.key
                                            ? 'bg-white/10 border-l-2 border-l-premium-accent text-white'
                                            : 'hover:bg-white/5 text-slate-300'
                                        }`}
                                    onClick={() => setFilters({ ...filters, type: t.key })}
                                >
                                    {t.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
        </aside>
    );
}
