import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSubTournaments, type SubTournament } from '../../hooks/useSubTournaments';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';
import { api } from '../../lib/api';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
type SortKey = 'alpha' | 'created' | 'age' | 'weight';

function parseNum(x: unknown, def = NaN) {
    const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x);
    return Number.isFinite(n) ? n : def;
}

// Durum haritası
type Phase = 'pending' | 'in_progress' | 'completed';

// API’den dönebilecek muhtemel alanlara dayanarak faz çıkarımı
function inferPhaseFromDetail(detail: any): Phase {
    const started = Boolean(detail?.started ?? detail?.has_started ?? detail?.is_started);
    const completed = Boolean(detail?.completed ?? detail?.is_completed);
    if (completed) return 'completed';
    if (started) return 'in_progress';
    return 'pending';
}


/* ──────────────────────────────────────────────────────────────────────────
   Single Row (local)
   - Entire card is clickable → Bracket
   - Hover glow: green→purple
   - ⋯ menu: Edit (wizard), Delete (API) with custom lightbox
   ────────────────────────────────────────────────────────────────────────── */
function Row({
                 item,
                 onChanged,
             }: {
    item: SubTournament;
    onChanged: () => void;
}) {
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const goView = () => nav(`/bracket/${item.public_slug}`);
    const goEdit = () =>
        nav(
            `/create?mode=sub&edit=${encodeURIComponent(item.public_slug)}&parent=${item.tournament}`
        );

    const gender =
        String(item.gender || '').toUpperCase() === 'M'
            ? 'Male'
            : String(item.gender || '').toUpperCase() === 'F'
                ? 'Female'
                : 'Mixed';

    const confirmDelete = async () => {
        try {
            setDeleting(true);
            await api.delete(`subtournaments/${encodeURIComponent(item.public_slug)}/`);
            setConfirmOpen(false);
            onChanged();
        } catch {
            alert('Silme işlemi başarısız oldu.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={goView}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') goView();
                }}
                className="
          group relative p-4 rounded-lg bg-[#2d3038]
          border border-white/10 cursor-pointer transition
          focus:outline-none
          hover:border-emerald-400/50
          hover:shadow-[0_0_0_2px_rgba(16,185,129,.45),0_0_22px_6px_rgba(168,85,247,.28),0_0_16px_4px_rgba(16,185,129,.28)]
          flex items-center justify-between
        "
            >
                <div className="pr-3">
                    <div className="font-semibold text-slate-100">{item.title}</div>
                    <div className="text-sm text-white/60">
                        {gender} · Age {Number(item.age_min || 0)}–{Number(item.age_max || 0)} · Weight{' '}
                        {(item.weight_min || '?') + '–' + (item.weight_max || '?')}
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // prevent card navigation
                            setOpen((v) => !v);
                        }}
                        className="
              w-10 h-10 rounded-full
              bg-[#0d1117] text-white/90
              border border-white/10
              ring-1 ring-white/5
              shadow-inner
              hover:border-emerald-400/40 hover:ring-emerald-400/30
              flex items-center justify-center
            "
                        aria-haspopup="menu"
                        aria-expanded={open}
                        title="İşlemler"
                    >
                        {/* three-dot icon (clean, centered) */}
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="6"  cy="12" r="1.7" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.7" fill="currentColor" />
                            <circle cx="18" cy="12" r="1.7" fill="currentColor" />
                        </svg>
                    </button>

                    {open && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-44 rounded-lg bg-[#1f232a] border border-white/10 shadow-xl z-20"
                            onMouseLeave={() => setOpen(false)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    goEdit();
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/10 text-emerald-300"
                                role="menuitem"
                            >
                                ✏️ Düzenle
                            </button>
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    setConfirmOpen(true);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/10 text-red-300"
                                role="menuitem"
                            >
                                🗑️ Sil
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Lightbox Confirm */}
            {confirmOpen && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center"
                    onClick={() => setConfirmOpen(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="absolute inset-0 bg-black/60" />
                    <div
                        className="relative z-10 w-[min(92vw,540px)] rounded-2xl bg-[#2a2d34] border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="text-base font-semibold text-white mb-1">
                                Silmek istediğinize emin misiniz?
                            </div>
                            <p className="text-sm text-white/80 mb-4">
                                “{item.title}” geri alınamaz şekilde silinecek.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setConfirmOpen(false)}
                                    className="px-4 py-2 rounded bg-[#3b4252] hover:bg-[#454d62] text-white/90"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60"
                                >
                                    {deleting ? 'Siliniyor…' : 'Evet, sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */
export default function TournamentSubListPage() {
    const { public_slug } = useParams<{ public_slug: string }>();
    const [sp] = useSearchParams();
    const parentIdFromQuery = Number(sp.get('parent') || '');
    const parentId = Number.isFinite(parentIdFromQuery) ? parentIdFromQuery : undefined;

    const { data, isLoading, isError, error, refetch } = useSubTournaments(public_slug);

    const [filters, setFilters] = useState<SubFilters>({
        status: 'all',
        gender: 'all',
        ageMin: '',
        ageMax: '',
        weightMin: '',
        weightMax: '',
    });

    // slug -> phase cache (detay çağrıları için)
    const [statusMap, setStatusMap] = useState<Record<string, Phase>>({});

    const [sort, setSort] = useState<SortKey>('alpha');
    const [q, setQ] = useState('');

    // Status filtresi 'all' değilse ve listedeki maddelerde started/completed alanları yoksa
// küçük bir detay prefetch'i yapıp cache'leyelim.
    useEffect(() => {
        if (filters.status === 'all' || !data?.length) return;

        // started/completed alanı olmayan ve cache'te olmayanları topla
        const candidates = (data as SubTournament[]).filter((s) => {
            const hasInline =
                ('started' in (s as any)) || ('has_started' in (s as any)) ||
                ('completed' in (s as any)) || ('is_completed' in (s as any));
            const cached = statusMap[s.public_slug];
            return !hasInline && !cached;
        });

        if (!candidates.length) return;

        // Aşırıya kaçmamak için ilk 12 taneyi çekelim
        const pick = candidates.slice(0, 12);

        Promise.all(
            pick.map(async (s) => {
                try {
                    const { data: detail } = await api.get(`subtournaments/${encodeURIComponent(s.public_slug)}/`);
                    return [s.public_slug, inferPhaseFromDetail(detail)] as const;
                } catch {
                    return [s.public_slug, 'pending'] as const;
                }
            })
        ).then((entries) => {
            setStatusMap((prev) => {
                const next = { ...prev };
                for (const [slug, phase] of entries) next[slug] = phase;
                return next;
            });
        });
    }, [filters.status, data]); // statusMap bağımlılığına gerek yok; setState merge ediyoruz

    function getPhaseFromItemOrCache(s: SubTournament, cache: Record<string, Phase>): Phase {
        const started = Boolean((s as any).started ?? (s as any).has_started ?? (s as any).is_started);
        const completed = Boolean((s as any).completed ?? (s as any).is_completed);
        if (completed) return 'completed';
        if (started) return 'in_progress';
        return cache[s.public_slug] ?? 'pending';
    }


    const list = useMemo(() => {
        const base = (data ?? []).filter((s) =>
            !q ? true : s.title.toLowerCase().includes(q.toLowerCase())
        );

        const byStatus = base.filter((s) =>
             filters.status === 'all' ? true : getPhaseFromItemOrCache(s, statusMap) === filters.status
        );

        const byGender = byStatus.filter((s) =>
            filters.gender === 'all' ? true : String(s.gender || '').toUpperCase() === filters.gender
        );

        const amin = filters.ageMin ? parseInt(filters.ageMin, 10) : -Infinity;
        const amax = filters.ageMax ? parseInt(filters.ageMax, 10) : Infinity;
        const byAge = byGender.filter((s) => {
            const lo = Number.isFinite(s.age_min as never) ? Number(s.age_min) : -Infinity;
            const hi = Number.isFinite(s.age_max as never) ? Number(s.age_max) : Infinity;
            return !(hi < amin || lo > amax);
        });

        const wmin = filters.weightMin ? parseNum(filters.weightMin, -Infinity) : -Infinity;
        const wmax = filters.weightMax ? parseNum(filters.weightMax, Infinity) : Infinity;
        const byWeight = byAge.filter((s) => {
            const lo = parseNum(s.weight_min, -Infinity);
            const hi = parseNum(s.weight_max, Infinity);
            return !(hi < wmin || lo > wmax);
        });

        const arr = [...byWeight];

        arr.sort((a, b) => {
            switch (sort) {
                case 'alpha':
                    return a.title.localeCompare(b.title, 'tr');
                case 'created':
                    return (
                        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
                    );
                case 'age': {
                    const ax = Number(a.age_min ?? 0);
                    const bx = Number(b.age_min ?? 0);
                    return ax - bx || a.title.localeCompare(b.title, 'tr');
                }
                case 'weight': {
                    const aw = (parseNum(a.weight_min) + parseNum(a.weight_max)) / 2;
                    const bw = (parseNum(b.weight_min) + parseNum(b.weight_max)) / 2;
                    return aw - bw || a.title.localeCompare(b.title, 'tr');
                }
            }
        });

        return arr;
    }, [data, q, filters, sort]);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex gap-6">
                <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug} />

                <div className="flex-1">
                    {/* top bar */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
                        <div>
                            <h2 className="text-xl font-semibold">All Brackets</h2>
                            <p className="text-sm text-gray-400">
                                Toplam <b>{data?.length ?? 0}</b> alt turnuva
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Hızlı ara (başlık)…"
                                    className="bg-gray-700/70 px-3 py-2 rounded text-sm w-56 placeholder:text-gray-300"
                                    aria-label="Alt turnuva ara"
                                />
                                {q && (
                                    <button
                                        onClick={() => setQ('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* sort */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">SIRALA:</span>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as SortKey)}
                                    className="bg-gray-700 px-2 py-2 rounded text-sm"
                                >
                                    <option value="alpha">Alfabetik (A–Z)</option>
                                    <option value="created">Oluşturma Tarihi (Yeni → Eski)</option>
                                    <option value="age">Yaşa göre (Min yaş ↑)</option>
                                    <option value="weight">Kiloya göre (Ortalama ↑)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* content states */}
                    {isLoading && <SkeletonList />}
                    {isError && (
                        <div className="mt-2 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6">
                            <p className="text-red-300 font-semibold mb-2">Veri alınamadı.</p>
                            <p className="text-sm text-gray-300 mb-4">
                                {error instanceof Error ? error.message : 'Bilinmeyen hata.'}
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    )}

                    {!isLoading && !isError && (
                        <>
                            {!list.length ? (
                                <div className="rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
                                    <div className="text-lg font-semibold mb-2">Henüz alt turnuvanız yok</div>
                                    <p className="text-sm text-gray-300 mb-5">Oluşturmak ister misiniz?</p>
                                    {parentId ? (
                                        <Link
                                            to={`/create?mode=sub&parent=${parentId}`}
                                            className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
                                        >
                                            Alt Turnuva Oluştur
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/create?mode=sub"
                                            className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
                                        >
                                            Alt Turnuva Oluştur
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 pb-8">
                                    {list.map((s) => (
                                        <Row key={s.id} item={s} onChanged={refetch} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-20 rounded-lg bg-[#2a2d34] border border-white/5 relative overflow-hidden"
                >
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
            ))}
        </div>
    );
}
