// src/app/pages/Tournements/TournamentSubListPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSubTournaments, type SubTournament } from '../../hooks/useSubTournaments';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers & Types
   ────────────────────────────────────────────────────────────────────────── */
type SortKey = 'alpha' | 'created' | 'age' | 'weight';

function parseNum(x: unknown, def = NaN) {
    const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x);
    return Number.isFinite(n) ? n : def;
}

type Phase = 'pending' | 'in_progress' | 'completed';

function inferPhaseFromDetail(detail: any): Phase {
    const started = Boolean(detail?.started);
    const finished = Boolean(detail?.finished);
    if (finished) return 'completed';
    if (started) return 'in_progress';
    return 'pending';
}

function inlinePhase(s: any): Phase {
    const started = Boolean(s?.started);
    const finished = Boolean(s?.finished);
    if (finished) return 'completed';
    if (started) return 'in_progress';
    return 'pending';
}

const PHASE_BADGE = {
    pending: { text: 'Bekleyen', chip: 'bg-amber-500/20 text-amber-200' },
    in_progress: { text: 'Başlayan', chip: 'bg-emerald-600/20 text-emerald-300' },
    completed: { text: 'Biten', chip: 'bg-red-600/20 text-red-200' },
} as const;

type ImportSummary = {
    tournament: string;
    created_subtournaments: number;
    created_matches: number;
    renumbered: number;
    invalid_license_rows: number;
    clubs_created_or_used: number;
};

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
            `/create?mode=sub&edit=${encodeURIComponent(item.public_slug)}&parent=${item.tournament}`,
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-300 text-xl select-none">
                        🏆
                    </div>

                    <div>
                        <div className="font-semibold text-slate-100">{item.title}</div>

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

                    {canManage && (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
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
                        </div>
                    )}
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

    const [statusMap, setStatusMap] = useState<Record<string, Phase>>({});
    const [sort, setSort] = useState<SortKey>('alpha');
    const [q, setQ] = useState('');
    const [canManage, setCanManage] = useState(false);

    // Import lightbox state
    const [showImport, setShowImport] = useState(false);
    const [summary, setSummary] = useState<ImportSummary | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!public_slug) {
                setCanManage(false);
                return;
            }
            try {
                const { data } = await api.get(`tournaments/${encodeURIComponent(public_slug)}/`);
                if (!cancelled) setCanManage(Boolean((data as any)?.can_edit));
            } catch {
                if (!cancelled) setCanManage(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [public_slug]);

    useEffect(() => {
        if (filters.status === 'all' || !data?.length) return;

        const candidates = (data as SubTournament[]).filter((s) => {
            const hasInline = 'started' in (s as any) || 'finished' in (s as any);
            const cached = statusMap[s.public_slug];
            return !hasInline && !cached;
        });

        if (!candidates.length) return;

        const pick = candidates.slice(0, 12);

        Promise.all(
            pick.map(async (s) => {
                try {
                    const { data: detail } = await api.get(
                        `subtournaments/${encodeURIComponent(s.public_slug)}/`,
                    );
                    return [s.public_slug, inferPhaseFromDetail(detail)] as const;
                } catch {
                    return [s.public_slug, 'pending'] as const;
                }
            }),
        ).then((entries) => {
            setStatusMap((prev) => {
                const next = { ...prev };
                for (const [slug, phase] of entries) next[slug] = phase;
                return next;
            });
        });
    }, [filters.status, data]);

    function getPhaseFromItemOrCache(s: SubTournament, cache: Record<string, Phase>): Phase {
        const started = Boolean((s as any).started);
        const finished = Boolean((s as any).finished);
        if (finished) return 'completed';
        if (started) return 'in_progress';
        return cache[s.public_slug] ?? 'pending';
    }

    const list = useMemo(() => {
        const base = (data ?? []).filter((s) => (!q ? true : s.title.toLowerCase().includes(q.toLowerCase())));

        const byStatus = base.filter((s) =>
            filters.status === 'all' ? true : getPhaseFromItemOrCache(s, statusMap) === filters.status,
        );

        const byGender = byStatus.filter((s) =>
            filters.gender === 'all' ? true : String(s.gender || '').toUpperCase() === filters.gender,
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
                    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
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
                            <p className="text-sm text-gray-400">Toplam <b>{data?.length ?? 0}</b> alt turnuva</p>
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

                            {/* 🔽 Excel import (sadece yetkili) */}
                            {canManage && (
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm shadow"
                                    type="button"
                                >
                                    Excel’den İçe Aktar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Import summary banner */}
                    {summary && (
                        <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-medium text-emerald-200 mb-1">İçe Aktarma Özeti</div>
                                    <div className="grid sm:grid-cols-3 gap-x-6 gap-y-1">
                                        <div>Alt Turnuva: <b>{summary.created_subtournaments}</b></div>
                                        <div>Maç: <b>{summary.created_matches}</b></div>
                                        <div>Numaralandırılan Maç: <b>{summary.renumbered}</b></div>
                                        <div>Kulüp sayısı: <b>{summary.clubs_created_or_used}</b></div>
                                        <div>Geçersiz sicil satırı: <b>{summary.invalid_license_rows}</b></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSummary(null)}
                                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-emerald-100"
                                    type="button"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    )}

                    {/* content states */}
                    {isLoading && <SkeletonList />}

                    {isError &&
                        (() => {
                            const code = errorStatus;
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
                                            <Link
                                                to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                                            >
                                                Giriş Yap →
                                            </Link>
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
                                        <p className="text-sm text-gray-300 mb-4">Böyle bir turnuva yok ya da erişiminiz yok.</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <Link to="/" className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">← Dashboard</Link>
                                            <Link
                                                to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                                            >
                                                Giriş Yap →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            }
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
                                    <div className="text-lg font-semibold mb-2">Henüz alt turnuvarınız yok</div>
                                    <p className="text-sm text-gray-300 mb-5">Oluşturmak ister misiniz?</p>
                                    {canManage &&
                                        (parentId ? (
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

            {/* Lightbox */}
            {showImport && public_slug && (
                <ImportLightbox
                    tournamentSlug={public_slug}
                    onClose={() => setShowImport(false)}
                    onDone={(sum) => {
                        setShowImport(false);
                        if (sum) setSummary(sum);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-[#2a2d34] border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
            ))}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Import Lightbox
   ────────────────────────────────────────────────────────────────────────── */
function ImportLightbox({
                            onClose,
                            onDone,
                            tournamentSlug,
                        }: {
    onClose: () => void;
    onDone: (s: ImportSummary | null) => void;
    tournamentSlug: string;
}) {
    type Row = { age: string; weight: string };
    const [rows, setRows] = useState<Row[]>([
        { age: '12-15', weight: '10-15' },
        { age: '15-18', weight: '15-20' },
        { age: '12-15', weight: '20-35' },
    ]);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [fuzzy, setFuzzy] = useState(true);
    const [courtNo, setCourtNo] = useState('1');
    const [startFrom, setStartFrom] = useState(''); // boşsa backend court*100 kullanır

    function addRow() {
        setRows((x) => [...x, { age: '', weight: '' }]);
    }
    function updateRow(i: number, patch: Partial<Row>) {
        setRows((xs) => xs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }
    function removeRow(i: number) {
        setRows((xs) => xs.filter((_, idx) => idx !== i));
    }

    function parseRange(txt: string): [number, number | null] | null {
        const s = (txt || '').trim();
        if (!s) return null;
        if (s.endsWith('+')) {
            const v = Number(s.slice(0, -1).replace(',', '.'));
            if (!isFinite(v)) return null;
            return [Math.floor(v), null];
        }
        const m = s.split('-').map((t) => t.trim().replace(',', '.'));
        if (m.length !== 2) return null;
        const a = Number(m[0]),
            b = Number(m[1]);
        if (!isFinite(a) || !isFinite(b)) return null;
        return [Math.floor(Math.min(a, b)), Math.floor(Math.max(a, b))];
    }

    async function submit() {
        if (!file) return alert('Lütfen Excel dosyası seçin.');
        const cats = [];
        for (const r of rows) {
            const ageR = parseRange(r.age);
            const kgR = parseRange(r.weight);
            if (!ageR || !kgR) {
                return alert('Geçersiz yaş/kilo aralığı. "12-15" ya da "45+" gibi girin.');
            }
            const [age_min, age_max] = ageR;
            const [w_min, w_max] = kgR;
            cats.push({
                age_min,
                age_max: age_max ?? age_min,
                weight_min: String(w_min),
                weight_max: w_max === null ? `${w_min}+` : String(w_max),
            });
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('categories', JSON.stringify(cats));
        fd.append('use_fuzzy_club_merge', fuzzy ? '1' : '0');
        if (courtNo) fd.append('court_no', courtNo);
        if (startFrom) fd.append('start_from', startFrom);

        setBusy(true);
        try {
            const res = await api.post<ImportSummary>(
                `tournaments/${encodeURIComponent(tournamentSlug)}/import-subtournaments/`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            onDone(res.data);
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            alert(detail || 'İçe aktarma başarısız.');
            onDone(null);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="relative z-10 mx-auto mt-8 w-[min(92vw,780px)] rounded-2xl border border-white/10 bg-[#1e222a] p-6 text-white shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold">Excel’den Alt Turnuva İçe Aktar</div>
                    <button onClick={onClose} className="text-xl text-gray-300 hover:text-white" type="button">
                        ✕
                    </button>
                </div>

                <div className="grid gap-5">
                    {/* Dosya */}
                    <div>
                        <div className="text-sm text-gray-300 mb-1">Excel Dosyası (XLSX)</div>
                        <input
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-white/10 file:bg-[#2b2f36] file:text-white hover:file:bg-[#333a48]"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            Gerekli sütunlar: Sicil, Ad/Soyad, Cinsiyet, Doğum Tarihi/Yılı, Kilo, Kulüp.
                        </div>
                    </div>

                    {/* Siklet türleri */}
                    <div>
                        <div className="text-sm text-gray-300 mb-2">Siklet Türleri</div>
                        <div className="rounded-xl border border-white/10 bg-[#13171f]">
                            <div className="grid grid-cols-12 px-4 py-2 text-xs text-gray-400 border-b border-white/10">
                                <div className="col-span-5">Yaş aralığı (örn. 12-15)</div>
                                <div className="col-span-5">Kilo aralığı (örn. 10-15 ya da 45+)</div>
                                <div className="col-span-2 text-right">Sil</div>
                            </div>
                            {rows.map((r, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 items-center border-b border-white/5">
                                    <input
                                        value={r.age}
                                        onChange={(e) => updateRow(i, { age: e.target.value })}
                                        placeholder="12-15"
                                        className="col-span-5 bg-[#1b2030] border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={r.weight}
                                        onChange={(e) => updateRow(i, { weight: e.target.value })}
                                        placeholder="10-15 veya 45+"
                                        className="col-span-5 bg-[#1b2030] border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                    <div className="col-span-2 text-right">
                                        <button
                                            onClick={() => removeRow(i)}
                                            className="px-3 py-2 rounded bg-red-600/80 hover:bg-red-600 text-white text-sm"
                                            type="button"
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="px-4 py-3">
                                <button
                                    onClick={addRow}
                                    className="px-3 py-2 rounded bg-[#283041] hover:bg-[#2f384c] border border-white/10 text-sm"
                                    type="button"
                                >
                                    + Satır Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Seçenekler */}
                    <div className="grid sm:grid-cols-3 gap-3">
                        <label className="space-y-1">
                            <div className="text-sm text-gray-300">Kort No</div>
                            <input
                                value={courtNo}
                                onChange={(e) => setCourtNo(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-[#1b2030] border border-white/10 rounded px-3 py-2 text-sm"
                                placeholder="1"
                            />
                        </label>
                        <label className="space-y-1">
                            <div className="text-sm text-gray-300">Başlangıç Maç No (ops.)</div>
                            <input
                                value={startFrom}
                                onChange={(e) => setStartFrom(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-[#1b2030] border border-white/10 rounded px-3 py-2 text-sm"
                                placeholder="court*100"
                            />
                        </label>
                        <label className="flex items-center gap-2 mt-6">
                            <input type="checkbox" checked={fuzzy} onChange={(e) => setFuzzy(e.target.checked)} />
                            <span className="text-sm text-gray-300">Benzer kulüp adlarını birleştir</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                        <button
                            onClick={onClose}
                            className="px-3 py-2 rounded bg-[#2b2f36] hover:bg-[#333a48] border border-white/10 text-sm"
                            disabled={busy}
                            type="button"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={submit}
                            disabled={busy || !file || rows.length === 0}
                            className={['px-4 py-2 rounded font-medium shadow', busy ? 'bg-gray-600 text-white/80' : 'bg-emerald-600 hover:bg-emerald-500 text-white'].join(' ')}
                            type="button"
                        >
                            {busy ? 'Gönderiliyor…' : 'İçe Aktar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
