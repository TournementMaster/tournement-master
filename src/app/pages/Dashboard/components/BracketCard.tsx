import type { BracketSummary } from '../../../hooks/useBracket';
import { Link } from 'react-router-dom';

function typeLabel(t: BracketSummary['type']) {
    switch (t) {
        case 'single':      return 'Single Elimination';
        case 'double':      return 'Double Elimination';
        case 'round_robin': return 'Round Robin';
        case 'group':       return 'Group Stage';
    }
}

export default function BracketCard({ item }: { item: BracketSummary }) {
    const isMain = item.category === 'main';
    return (
        <div className={`bg-[#2d3038] rounded-lg px-5 py-4 flex items-center justify-between border ${isMain ? 'border-amber-400/40' : 'border-transparent'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMain ? 'bg-amber-500/20' : 'bg-black/40'}`}>
                    <div className={`w-5 h-5 border-2 rounded-sm ${isMain ? 'border-amber-300' : 'border-gray-300'}`} />
                </div>
                <div>
                    <div className={`${isMain ? 'text-xl font-bold text-amber-300' : 'font-semibold'}`}>
                        {item.title} {isMain && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">ANA</span>}
                    </div>
                    <div className="text-gray-400 text-sm">{typeLabel(item.type)}</div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-sm text-gray-300">{item.participants} <span className="opacity-70">👤</span></div>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-5 bg-gray-700 rounded">
                        <div
                            className="h-5 bg-green-500 rounded"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                    <span className="text-sm text-gray-200 w-12 text-right">{item.progress}%</span>
                </div>
                <Link
                    to={`/`} // detay sayfan hazırsa burayı değiştir
                    className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-sm"
                >
                    →
                </Link>
            </div>
        </div>
    );
}
