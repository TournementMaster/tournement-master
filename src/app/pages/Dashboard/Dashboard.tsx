import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrackets, type BracketSummary } from '../../hooks/useBracket';

type SortKey = 'recent' | 'alpha';
type UIBracket = BracketSummary & { _sample?: boolean };

/* === Premium ikon (taç + madalya + defne, altın degrade) === */
function PremiumBadgeSVG() {
    const gid = useId();
    return (
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden>
            <defs>
                <linearGradient id={`gold-${gid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"  stopColor="#F8E08E" />
                    <stop offset="55%" stopColor="#F3C969" />
                    <stop offset="100%" stopColor="#E3B23C" />
                </linearGradient>
            </defs>
            <g stroke={`url(#gold-${gid})`} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                {/* Taç */}
                <path d="M7 7l2 1.2 3-2.2 3 2.2L17 7l-.7 3H7.7L7 7z" />
                <rect x="8" y="10" width="8" height="1.2" rx="0.6" />
                {/* Madalya */}
                <circle cx="12" cy="14.5" r="4.5" />
                {/* Yıldız */}
                <path d="M12 12.7l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.3 1.8-.3.8-1.6z" />
                {/* Defne dalları */}
                <path d="M6.2 14.5c-1.2-1.1-1.8-2.2-1.8-3.3 0-.7.2-1.4.5-2" />
                <path d="M17.8 14.5c1.2-1.1 1.8-2.2 1.8-3.3 0-.7-.2-1.4-.5-2" />
                <path d="M6.3 12.5l-1.3.2M6.8 11l-1.2-.1M7.4 9.8L6.3 9.2" />
                <path d="M17.7 12.5l1.3.2M17.2 11l1.2-.1M16.6 9.8l1.1-.6" />
            </g>
        </svg>
    );
}

export default function Dashboard() {
    const { data } = useBrackets();
    const [sort, setSort] = useState<SortKey>('recent');
    const year = new Date().getFullYear();

    // Sadece ANA turnuvalar (category==='main' yoksa parentId==null → 'main' say)
    const mains = useMemo<UIBracket[]>(
        () => (data ?? []).filter(b => (b.category ?? (b.parentId == null ? 'main' : 'sub')) === 'main'),
        [data]
    );

    // Backend boşsa ekranda örnek iki kart göster
    const samples: UIBracket[] = [
        { id: -1, title: '2025 İstanbul Şampiyonası', type: 'single', participants: 16, progress: 0, status: 'pending', category: 'main', parentId: null, _sample: true },
        { id: -2, title: 'City Open (Main)',          type: 'double', participants: 8,  progress: 0, status: 'pending', category: 'main', parentId: null, _sample: true },
    ];

    const source: UIBracket[] = mains.length ? mains : samples;

    const list = useMemo(() => {
        const arr = [...source];
        if (sort === 'alpha') {
            arr.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        } else {
            // Zamana göre: created_at yoksa id’yi yaklaşık “yeni → eski” kabul ediyoruz.
            arr.sort((a, b) => b.id - a.id);
        }
        return arr;
    }, [source, sort]);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Üst kontrol çubuğu */}
            <div className="flex items-center justify-between py-4">
                <h2 className="text-xl font-semibold">Ana Turnuvalar</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">SIRALA:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        className="bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                        <option value="recent">Zamana göre (Yeni → Eski)</option>
                        <option value="alpha">Alfabetik (A–Z)</option>
                    </select>
                </div>
            </div>

            {/* Kartlar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-4">
                {list.map((it) => {
                    const CardInner = (
                        <div
                            className="group w-[260px] h-[200px] bg-gray-600/60 rounded-md mx-auto flex flex-col items-center justify-center
                         hover:bg-gray-500/60 transition relative"
                        >
                            {it._sample && (
                                <span className="absolute top-2 left-2 text-[10px] bg-amber-500 text-black rounded px-2 py-0.5 font-semibold">
                  Örnek
                </span>
                            )}
                            <PremiumBadgeSVG />
                            <div className="mt-3 text-center">
                                <div className="text-xs text-gray-200/90">{year}</div>
                                <div className="text-white font-semibold mt-1">{it.title}</div>
                            </div>
                        </div>
                    );

                    // Örnek kart tıklanamaz; gerçek kart /bracket/:id’e gider
                    return it._sample ? (
                        <div key={it.id} className="cursor-default select-none">
                            {CardInner}
                        </div>
                    ) : (
                        <Link key={it.id} to={`/bracket/${it.id}`}>
                            {CardInner}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
