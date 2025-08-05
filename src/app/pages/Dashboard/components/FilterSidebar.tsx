import type { BracketStatus, BracketType } from '../../../hooks/useBracket';

export type Filters = {
    status: BracketStatus | 'all';
    type:   BracketType   | 'all';
};

interface Props {
    filters: Filters;
    setFilters: (f: Filters) => void;
}

const statusItems: { key: Filters['status']; label: string }[] = [
    { key: 'pending',      label: 'Pending' },
    { key: 'in_progress',  label: 'In Progress' },
    { key: 'completed',    label: 'Completed' },
];

const typeItems: { key: Filters['type']; label: string }[] = [
    { key: 'single',       label: 'Single Elimination' },
    { key: 'double',       label: 'Double Elimination' },
    { key: 'round_robin',  label: 'Round Robin' },
    { key: 'group',        label: 'Group Stage' },
];

export default function FilterSidebar({ filters, setFilters }: Props) {
    return (
        <aside className="w-64 bg-[#2d3038] rounded-lg p-4 h-fit sticky top-6">
            <nav className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">STATUS</h3>
                    <ul className="space-y-1">
                        <li>
                            <button
                                className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.status==='all'?'bg-gray-700':''}`}
                                onClick={() => setFilters({ ...filters, status: 'all' })}
                            >
                                All
                            </button>
                        </li>
                        {statusItems.map(s => (
                            <li key={s.key}>
                                <button
                                    className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.status===s.key?'bg-gray-700':''}`}
                                    onClick={() => setFilters({ ...filters, status: s.key })}
                                >
                                    {s.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">TYPE</h3>
                    <ul className="space-y-1">
                        <li>
                            <button
                                className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.type==='all'?'bg-gray-700':''}`}
                                onClick={() => setFilters({ ...filters, type: 'all' })}
                            >
                                All
                            </button>
                        </li>
                        {typeItems.map(t => (
                            <li key={t.key}>
                                <button
                                    className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 ${filters.type===t.key?'bg-gray-700':''}`}
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
