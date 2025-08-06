/* =========================================================================
   FILE: src/app/pages/Dashboard/Dashboard.tsx
   AMAÇ
   - Ana (owner olduğunuz) turnuvaları /api/tournaments/ üzerinden çeker.
   - Yükleniyor / hata / boş durumlarını kullanıcı dostu şekilde gösterir.
   - Sıralama (Zamana göre | Alfabetik) ve hızlı arama (başlık) sunar.
   - id ↔ public_slug haritalarını sessionStorage'a yazar (detay sayfaları için).
   - Kart tıklamasında /bracket/:id sayfasına yönlendirir.

   NOT
   - useTournaments hook'u: src/app/hooks/useTournaments.tsx
   - Logonuz: /public/brand/main-logo.png → MAIN_LOGO_URL ile kullanılıyor.
   ========================================================================= */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournaments, type Tournament } from '../../hooks/useTournaments';

type SortKey = 'recent' | 'alpha';

const MAIN_LOGO_URL = '/brand/main-logo.png';

export default function Dashboard() {
    const { data, isLoading, isError, error, refetch } = useTournaments();
    console.log(data);
    const [sort, setSort] = useState<SortKey>('recent');
    const [q, setQ] = useState('');

    // Güvenlik: Haritaları tekrar yaz (hook zaten yazıyorsa no-op niteliğinde)
    useEffect(() => {
        if (!data) return;
        try {
            const idToSlug: Record<number, string> = {};
            const slugToId: Record<string, number> = {};
            for (const t of data) {
                idToSlug[t.id] = t.public_slug;
                slugToId[t.public_slug] = t.id;
            }
            sessionStorage.setItem('tournament_id_to_slug', JSON.stringify(idToSlug));
            sessionStorage.setItem('tournament_slug_to_id', JSON.stringify(slugToId));
        } catch {
            // sessionStorage uygun değilse sessizce geç
        }
    }, [data]);

    const filtered = useMemo(() => {
        const base = data ?? [];
        const term = q.trim().toLowerCase();
        const byText = term
            ? base.filter((t) => t.title.toLowerCase().includes(term))
            : base;

        const cloned = [...byText];
        if (sort === 'alpha') {
            cloned.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        } else {
            cloned.sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );
        }
        return cloned;
    }, [data, q, sort]);

    /* -----------------------
       DURUM EKRANLARI
    ----------------------- */
    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={0}
                    subdued
                />
                <SkeletonGrid />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={0}
                    subdued
                />
                <div className="mt-8 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6">
                    <p className="text-red-300 font-semibold mb-2">Veri alınamadı.</p>
                    <p className="text-sm text-gray-300 mb-4">
                        {error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!filtered.length) {
        return (
            <div className="max-w-6xl mx-auto py-10">
                <HeaderBar
                    sort={sort}
                    setSort={setSort}
                    q={q}
                    setQ={setQ}
                    total={data?.length ?? 0}
                />
                <EmptyState />
            </div>
        );
    }

    /* -----------------------
       NORMAL GÖRÜNÜM
    ----------------------- */
    return (
        <div className="max-w-6xl mx-auto">
            <HeaderBar
                sort={sort}
                setSort={setSort}
                q={q}
                setQ={setQ}
                total={data?.length ?? 0}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-6">
                {filtered.map((t) => (
                    <Link key={t.id} to={`/tournements/${t.public_slug}`} aria-label={`${t.title} detayına git`}>
                        <Card tournament={t} />
                    </Link>
                ))}
            </div>
        </div>
    );
}

/* =========================================================================
   ALT BİLEŞENLER
   ========================================================================= */

function HeaderBar({
                       sort,
                       setSort,
                       q,
                       setQ,
                       total,
                       subdued = false,
                   }: {
    sort: SortKey;
    setSort: (s: SortKey) => void;
    q: string;
    setQ: (s: string) => void;
    total: number;
    subdued?: boolean;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
            <div>
                <h2 className="text-xl font-semibold">Ana Turnuvalar</h2>
                <p className={`text-sm ${subdued ? 'text-gray-500' : 'text-gray-400'}`}>
                    Toplam <b>{total}</b> kayıt
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Hızlı ara (başlık)…"
                        className="bg-gray-700/70 px-3 py-2 rounded text-sm w-56 placeholder:text-gray-300"
                        aria-label="Turnuva ara"
                    />
                    {q && (
                        <button
                            onClick={() => setQ('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                            aria-label="Aramayı temizle"
                            title="Temizle"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">SIRALA:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        className="bg-gray-700 px-2 py-2 rounded text-sm"
                        aria-label="Sıralama"
                    >
                        <option value="recent">Zamana göre (Yeni → Eski)</option>
                        <option value="alpha">Alfabetik (A–Z)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function Card({ tournament }: { tournament: Tournament }) {
    const dateRange =
        tournament.start_date && tournament.end_date
            ? formatDateRange(tournament.start_date, tournament.end_date)
            : null;

    return (
        <div
            className="group w-[260px] h-[240px] rounded-lg mx-auto bg-[#2a2d34] border border-white/5 shadow-lg shadow-black/30 relative overflow-hidden"
            title={tournament.title}
        >
            {/* Orta logo */}
            <div className="absolute inset-0 flex items-center justify-center">
                <img
                    src={MAIN_LOGO_URL}
                    alt="Ana turnuva logosu"
                    className="w-40 h-40 md:w-44 md:h-44 object-contain drop-shadow-[0_0_28px_rgba(0,255,170,.35)]"
                    draggable={false}
                />
            </div>

            {/* Üst bilgi bandı */}
            <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
          {tournament.season_year}
        </span>
                {tournament.city && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-900/40 border border-white/10 text-gray-200">
            {tournament.city}
          </span>
                )}
            </div>

            {/* Alt başlık bandı */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
                <div className="px-3 py-2 text-center text-white font-semibold truncate">
                    {tournament.title}
                </div>
                <div className="px-3 pb-2 text-center text-xs text-gray-300 truncate">
                    {dateRange ?? 'Tarih bilgisi yok'}
                </div>
            </div>

            {/* Hover vurgusu */}
            <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-emerald-300/50 rounded-lg transition" />
        </div>
    );
}

function SkeletonGrid() {
    const items = Array.from({ length: 6 }, (_, i) => i);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 py-6">
            {items.map((i) => (
                <div
                    key={i}
                    className="w-[260px] h-[240px] rounded-lg mx-auto bg-[#2a2d34] border border-white/5 relative overflow-hidden"
                >
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/30" />
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="mt-8 rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
            <div className="text-lg font-semibold mb-2">Henüz ana turnuva bulunmuyor</div>
            <p className="text-sm text-gray-300 mb-5">
                Yeni bir organizasyona başlamak için “Turnuva Oluştur” düğmesini kullanabilirsiniz.
            </p>
            <Link
                to="/create?mode=main"
                className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
            >
                Turnuva Oluştur
            </Link>
        </div>
    );
}

/* Basit tarih aralığı formatlayıcı (YYYY-MM-DD → DD.MM.YYYY – DD.MM.YYYY) */
function formatDateRange(a: string, b: string) {
    try {
        const aa = new Date(a);
        const bb = new Date(b);
        const f = (d: Date) =>
            `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        return `${f(aa)} – ${f(bb)}`;
    } catch {
        return null;
    }
}
