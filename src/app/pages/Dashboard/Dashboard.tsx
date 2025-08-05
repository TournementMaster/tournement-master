import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrackets, type BracketSummary } from '../../hooks/useBracket';

type SortKey = 'recent' | 'alpha';
type UIBracket = BracketSummary & { _sample?: boolean };

// Ortadaki büyük logo (gönderdiğin görseli public'e koy)
const MAIN_LOGO_URL = '/brand/main-logo.png';

export default function Dashboard() {
    const { data } = useBrackets();
    const [sort, setSort] = useState<SortKey>('recent');

    // Sadece ANA turnuvalar (category yoksa parentId==null → main say)
    const mains = useMemo<UIBracket[]>(
        () => (data ?? []).filter(b => (b.category ?? (b.parentId == null ? 'main' : 'sub')) === 'main'),
        [data]
    );

    // Backend boşsa ekranda 2 örnek ana turnuva göster
    const samples: UIBracket[] = [
        { id: -1, title: '2025 İstanbul Şampiyonası', type: 'single', participants: 16, progress: 0, status: 'pending', category: 'main', parentId: null, _sample: true },
        { id: -2, title: 'City Open (Main)',          type: 'double', participants: 8,  progress: 0, status: 'pending', category: 'main', parentId: null, _sample: true },
    ];

    const source: UIBracket[] = mains.length ? mains : samples;

    const list = useMemo(() => {
        const arr = [...source];
        if (sort === 'alpha') arr.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        else arr.sort((a, b) => b.id - a.id); // created_at yoksa id ~ zaman
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
                            className="group w-[260px] h-[220px] rounded-lg mx-auto bg-[#2a2d34] border border-white/5 shadow-lg shadow-black/30 relative overflow-hidden"
                            title={it._sample ? 'Örnek: Alt turnuva oluşturma ekranını aç' : it.title}
                        >
                            {it._sample && (
                                <span className="absolute top-2 left-2 text-[10px] bg-amber-400 text-black rounded px-2 py-0.5 font-semibold z-10">
                  Örnek
                </span>
                            )}

                            {/* ORTADA ve BÜYÜK LOGO */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img
                                    src={MAIN_LOGO_URL}
                                    alt="Ana turnuva logosu"
                                    className="w-40 h-40 md:w-44 md:h-44 object-contain drop-shadow-[0_0_28px_rgba(0,255,170,.35)]"
                                    draggable={false}
                                />
                            </div>

                            {/* Başlık (alta sabit) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
                                <div className="px-3 py-2 text-center text-white font-semibold truncate">
                                    {it.title}
                                </div>
                            </div>

                            {/* Hover vurgusu */}
                            <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-emerald-300/50 rounded-lg transition" />
                        </div>
                    );

                    // Örnek karta tıkla → alt turnuva sihirbazı (parent seçimi örnek olarak çıkar)
                    return it._sample ? (
                        <Link key={it.id} to="/create?mode=sub">
                            {CardInner}
                        </Link>
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
