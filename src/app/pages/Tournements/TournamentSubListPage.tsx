// src/app/pages/Tournements/TournamentSubListPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate, } from 'react-router-dom';
import { useSubTournaments, type SubTournament } from '../../hooks/useSubTournaments';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';


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
    const started  = Boolean(detail?.started);
    const finished = Boolean(detail?.finished);
    if (finished) return 'completed';
    if (started)  return 'in_progress';
    return 'pending';
}

// Satır içi durum (yalnızca item’dan)
function inlinePhase(s: any): Phase {
    const started  = Boolean(s?.started);
    const finished = Boolean(s?.finished);
    if (finished) return 'completed';
    if (started)  return 'in_progress';
    return 'pending';
}

const PHASE_BADGE = {
    pending:     { text: 'Bekleyen',   chip: 'bg-amber-500/20 text-amber-200' },
    in_progress: { text: 'Başlayan',   chip: 'bg-emerald-600/20 text-emerald-300' },
    completed:   { text: 'Biten',      chip: 'bg-red-600/20 text-red-200' },
} as const;

/* ──────────────────────────────────────────────────────────────────────────
   Single Row
   ────────────────────────────────────────────────────────────────────────── */
function Row({
                 item,
                 onChanged,
                 canManage,
             }: {
    item: SubTournament;
    onChanged: () => void;
    canManage: boolean;
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

    const phase = inlinePhase(item);
    const badge = PHASE_BADGE[phase];

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
                {/* SOL: ikona + başlık + alt satır */}
                <div className="pr-3 flex items-start gap-4">
                    {/* Küçük kupa ikonu */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-300 text-xl select-none">
                        🏆
                    </div>

                    <div>
                        <div className="font-semibold text-slate-100">{item.title}</div>

                        {/* Alt satır: Cinsiyet/Yaş/Kilo + DURUM NOKTASI */}
                        <div className="text-sm text-white/60 flex flex-wrap items-center gap-2">
              <span>
                {gender} · Age {Number(item.age_min || 0)}–{Number(item.age_max || 0)} · Weight{' '}
                  {(item.weight_min || '?') + '–' + (item.weight_max || '?')}

              </span>
                        </div>
                    </div>
                </div>

                {/* SAĞ: durum rozeti + menü */}
                <div className="relative flex items-center gap-4">
          <span className={`px-2 py-1 rounded text-xs border border-white/10 ${badge.chip}`}>
            {badge.text}
          </span>
                    {/* 🔒 Yalnızca yetkiliyse üç nokta menüsü */}
                    {canManage && (
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
                            type="button"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="6" cy="12" r="1.7" fill="currentColor" />
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
                                    type="button"
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
                                    type="button"
                                >
                                    🗑️ Sil
                                </button>
                            </div>
                        )}
                    </div>)}
                </div>
            </div>

            {/* Confirm */}
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
                            <p className="text-sm text-white/80 mb-4">“{item.title}” geri alınamaz şekilde silinecek.</p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setConfirmOpen(false)}
                                    className="px-4 py-2 rounded bg-[#3b4252] hover:bg-[#454d62] text-white/90"
                                    type="button"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60"
                                    type="button"
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
    const [canManage, setCanManage] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!public_slug) { setCanManage(false); return; }
            try {
                const { data } = await api.get(`tournaments/${encodeURIComponent(public_slug)}/`);
                if (!cancelled) setCanManage(Boolean((data as any)?.can_edit));
            } catch {
                if (!cancelled) setCanManage(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [public_slug]);

    // Status filtresi 'all' değilse ve listedeki maddelerde started/completed alanları yoksa
    // küçük bir detay prefetch'i yapıp cache'leyelim.
    useEffect(() => {
        if (filters.status === 'all' || !data?.length) return;

        const candidates = (data as SubTournament[]).filter((s) => {
            const hasInline = ('started' in (s as any)) ||('finished' in (s as any));
            const cached = statusMap[s.public_slug];
            return !hasInline && !cached;
        });

        if (!candidates.length) return;

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
    }, [filters.status, data]);

    function getPhaseFromItemOrCache(s: SubTournament, cache: Record<string, Phase>): Phase {
        const started  = Boolean((s as any).started);
        const finished = Boolean((s as any).finished);
        if (finished) return 'completed';
        if (started)  return 'in_progress';
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
    }, [data, q, filters, sort, statusMap]);

    // Hata status kodu
    const errorStatus = (error as any)?.response?.status ?? (error as any)?.status;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex gap-6">
                <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug} />

                <div className="flex-1">
                    {/* top bar */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
                        <div>
                            <h2 className="text-xl font-semibold">Tüm Alt Turnuvalar</h2>
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
                                        type="button"
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
                    {isError && (() => {
                        const code = errorStatus; // 401 / 403 / 404 / diğer
                        if (code === 401) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-2xl">🔒</div>
                                    <div className="text-amber-200 font-semibold mb-1">Erişim kısıtlı (401)</div>
                                    <p className="text-sm text-gray-300 mb-4">
                                        Bu sayfayı görüntülemek için oturum açın ya da organizatörden yetki isteyin.
                                    </p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/" className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">← Dashboard</Link>
                                        <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Giriş Yap →</Link>
                                    </div>
                                </div>
                            );
                        }
                        if (code === 403) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-2xl">🚫</div>
                                    <div className="text-amber-200 font-semibold mb-1">Yetkiniz yok (403)</div>
                                    <p className="text-sm text-gray-300 mb-4">
                                        Bu turnuvanın alt turnuvalarını görüntüleme yetkiniz bulunmuyor.
                                    </p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/" className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">← Dashboard</Link>
                                    </div>
                                </div>
                            );
                        }
                        if (code === 404) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-2xl">❓</div>
                                    <div className="text-violet-200 font-semibold mb-1">Turnuva bulunamadı (404)</div>
                                    <p className="text-sm text-gray-300 mb-4">
                                        Böyle bir turnuva yok ya da erişiminiz yok.
                                    </p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/" className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">← Dashboard</Link>
                                        <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Giriş Yap →</Link>
                                    </div>
                                </div>
                            );
                        }
                        // Diğer hatalar için mevcut "tekrar dene" panelini göster
                        return (
                            <div className="mt-2 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6 space-y-2">
                                <p className="text-red-300 font-semibold">Veri alınamadı.</p>
                                <p className="text-sm text-gray-300">
                                    {error instanceof Error ? error.message : 'Bilinmeyen hata.'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => refetch()}
                                        className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                                        type="button"
                                    >
                                        Tekrar Dene
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {!isLoading && !isError && (
                        <>
                            {!list.length ? (
                                <div className="rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
                                    <div className="text-lg font-semibold mb-2">Henüz alt turnuvanız yok</div>
                                    <p className="text-sm text-gray-300 mb-5">Oluşturmak ister misiniz?</p>
                                    {canManage && (
                                        parentId ? (
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
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4 pb-8">
                                    {list.map((s) => (
                                        <Row key={s.id} item={s} onChanged={refetch} canManage={canManage} />
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
