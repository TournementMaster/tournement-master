// src/app/pages/Tournements/TournamentSubListPage.tsx
import {useMemo, useState, useEffect} from 'react';
import {useParams, useSearchParams, Link, useNavigate} from 'react-router-dom';
import {useSubTournaments, type SubTournament} from '../../hooks/useSubTournaments';
import SubFilterSidebar, {type SubFilters} from './components/SubFilterSidebar';
import {api} from '../../lib/api';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
type SortKey = 'alpha' | 'created' | 'age' | 'weight';
type Phase = 'pending' | 'in_progress' | 'completed';
type AgeCatKey = 'kucukler' | 'minikler' | 'yildizlar' | 'gencler' | 'umitler' | 'buyukler';
const AGE_CATEGORIES: Record<AgeCatKey, { min: number; max: number | null }> = {
    kucukler: {min: 0, max: 10},
    minikler: {min: 10, max: 13},
    yildizlar: {min: 13, max: 15},
    gencler: {min: 15, max: 18},
    umitler: {min: 18, max: 20},
    buyukler: {min: 18, max: null},
};
const inCategory = (s: SubTournament, cat: AgeCatKey) => {
    const c = AGE_CATEGORIES[cat];
    const lo = Number(s.age_min ?? 0);
    const hi = Number.isFinite(s.age_max as never) ? Number(s.age_max) : Infinity;
    const max = (c.max ?? Infinity);
    return !((hi < c.min) || (max < lo));
};

type SubWithDay = SubTournament & { day?: string | null; court_no?: number | null };

const DAY_SENTINEL = '1970-01-01'; // backend default

const formatDayLabel = (iso?: string | null) => {
    if (!iso || iso === DAY_SENTINEL) return 'TARİH ATANMAMIŞ';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};


function parseNum(x: unknown, def = NaN) {
    const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x);
    return Number.isFinite(n) ? n : def;
}

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

// Güvenli UUID
function safeUUID(): string {
    const g: any = (typeof globalThis !== 'undefined') ? globalThis : window;
    const c = g?.crypto || g?.msCrypto;
    if (c?.randomUUID) return c.randomUUID();
    if (c?.getRandomValues) {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    }
    return `tmp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

const PHASE_BADGE = {
    pending: {text: 'Bekleyen', chip: 'bg-amber-500/20 text-amber-200'},
    in_progress: {text: 'Başlayan', chip: 'bg-emerald-600/20 text-emerald-300'},
    completed: {text: 'Biten', chip: 'bg-red-600/20 text-red-200'},
} as const;

/* ──────────────────────────────────────────────────────────────────────────
   IMPORT MODAL
   ────────────────────────────────────────────────────────────────────────── */
type ImportRow = {
    category: AgeCatKey;
    weight: string;
    courtMain: string;
    courtsDist: string;
    key: string;
};

function ImportModal({
                         onClose,
                         onImported,
                         publicSlug,
                     }: {
    onClose: () => void;
    onImported: () => void;
    publicSlug: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [rows, setRows] = useState<ImportRow[]>([
        { category: 'yildizlar', weight: '32', courtMain: '1', courtsDist: '1', key: safeUUID() },
        { category: 'gencler',   weight: '45', courtMain: '1', courtsDist: '1,2', key: safeUUID() },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [day, setDay] = useState<string>(() => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    });

    function addRow() {
        setRows((r) => [...r, {category: 'buyukler', weight: '', courtMain: '1', courtsDist: '', key: safeUUID()}]);
    }

    function removeRow(idx: number) {
        setRows((r) => r.filter((_, i) => i !== idx));
    }

    function parseWeightSingle(s: string) {
        const t = (s || '').trim().toLowerCase().replace(',', '.');
        const m = t.match(/^(\d+(?:\.\d+)?)$/);
        if (!m) return null;
        return m[1];
    }

    async function onSubmit() {
        setMsg(null);
        if (!file) {
            setMsg('Lütfen bir Excel (XLSX) dosyası seçin.');
            return;
        }

        const categories: any[] = [];
        for (const r of rows) {
            const cat = AGE_CATEGORIES[r.category];
            const w = parseWeightSingle(r.weight);
            if (!cat || !w) {
                setMsg('Geçersiz satır: kategori veya kilo değeri hatalı.');
                return;
            }
            const mainCourt = (r.courtMain || '1').trim();
            const preferred = (r.courtsDist || '')
                .split(/[,\s]+/)
                .map(x => x.trim())
                .filter(Boolean)
                .map(x => Number(x))
                .filter(n => Number.isFinite(n) && n > 0);

            categories.push({
                age_min: cat.min,
                age_max: (cat.max ?? 200),
                weight: w,
                court_no: Number(mainCourt),
                preferred_courts: preferred.length ? preferred : [Number(mainCourt)],
            });
        }
        if (!categories.length) {
            setMsg('En az bir satır girin.');
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('categories', JSON.stringify(categories));
            if (day) fd.append('day', day);

            const { data } = await api.post(
                `tournaments/${encodeURIComponent(publicSlug)}/import-subtournaments/`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setResult(data);
            setMsg(null);
        } catch (e: any) {
            const d = e?.response?.data?.detail;
            setMsg(typeof d === 'string' ? d : 'İçe aktarma başarısız oldu.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
            <div
                className="relative z-10 w-[min(92vw,920px)] max-h-[90vh] overflow-hidden rounded-2xl bg-[#20242c] border border-white/10 shadow-2xl flex flex-col">
                {submitting && <div className="absolute left-0 top-0 h-0.5 w-full overflow-hidden">
                    <div className="h-full w-1/3 bg-emerald-400/80 animate-[progress_1.2s_ease-in-out_infinite]"/>
                </div>}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="text-lg font-semibold text-white">Excel’den Alt Turnuva İçe Aktar</div>
                    <button onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Kapat">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div>
                        <div className="text-sm text-gray-300 mb-2">Excel Dosyası (XLSX)</div>
                        <label
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2a2f37] border border-white/10 cursor-pointer hover:bg-[#303644]">
                            <input
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                            <span className="text-sm text-white">{file ? file.name : 'Dosya Seç'}</span>
                        </label>
                        <div className="text-xs text-gray-400 mt-2">
                            Gerekli Excel sütunları: <b>ADI SOYADI, CİNSİYET, KULÜP, SİKLET, YAŞ KATEGORİSİ</b>.
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-300 mb-2">Maç Günü</div>
                        <input
                            type="date"
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            className="w-full max-w-[220px] px-3 py-2 rounded bg-[#1b1f24] border border-white/10 text-white text-sm"
                        />
                    </div>
                    <div>
                        <div className="text-sm text-gray-300 mb-2">Siklet Türleri</div>
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_130px_1fr_56px] bg-black/20 text-xs text-gray-400 px-4 py-2">
                                <div>Yaş Kategorisi</div>
                                <div>Kilo (tek)</div>
                                <div>Ana Kort</div>
                                <div>Dağıtılacak Kortlar (CSV)</div>
                                <div className="text-right pr-1">Sil</div>
                            </div>

                            <div className="divide-y divide-white/10">
                                {rows.map((r, idx) => (
                                    <div
                                        key={r.key}
                                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_130px_1fr_56px] gap-2 px-4 py-3 items-center"
                                    >
                                        <select
                                            value={r.category}
                                            onChange={(e) => setRows(list => list.map((x, i) => i === idx ? { ...x, category: e.target.value as AgeCatKey } : x))}
                                            className="w-full px-3 py-2 rounded bg-[#1b1f24] border border-white/10 text-white text-sm"
                                        >
                                            {Object.entries(AGE_CATEGORIES).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {k === 'buyukler' ? 'Büyükler' :
                                                        v.min === 0 ? 'Küçükler' :
                                                            v.min === 10 ? 'Minikler' :
                                                                v.min === 13 ? 'Yıldızlar' :
                                                                    v.min === 15 ? 'Gençler' :
                                                                        v.min === 18 && v.max === 20 ? 'Ümitler' : 'Büyükler'}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="örn. 32.0"
                                            value={r.weight}
                                            onChange={(e) => setRows(list => list.map((x,i) => i===idx ? { ...x, weight: e.target.value } : x))}
                                            className="w-full px-3 py-2 rounded bg-[#1b1f24] border border-white/10 text-white text-sm"
                                        />

                                        <input
                                            placeholder="1"
                                            value={r.courtMain}
                                            onChange={(e) => setRows(list => list.map((x,i) => i===idx ? { ...x, courtMain: e.target.value.replace(/\D/g,'') } : x))}
                                            className="w-full px-3 py-2 rounded bg-[#1b1f24] border border-white/10 text-white text-sm"
                                        />

                                        <input
                                            placeholder="1,2"
                                            value={r.courtsDist}
                                            onChange={(e) => setRows(list => list.map((x,i) => i===idx ? { ...x, courtsDist: e.target.value } : x))}
                                            className="w-full px-3 py-2 rounded bg-[#1b1f24] border border-white/10 text-white text-sm"
                                        />

                                        <div className="flex sm:justify-end">
                                            <button
                                                onClick={() => removeRow(idx)}
                                                className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                                                type="button"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-4 py-3 bg-black/10">
                                <button onClick={addRow}
                                        className="px-3 py-2 rounded bg-[#2a2f37] hover:bg-[#303644] border border-white/10 text-sm">
                                    + Satır Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    {msg && (
                        <div
                            className="rounded-lg border px-3 py-2 text-sm border-amber-400/20 bg-amber-500/10 text-amber-200">
                            {msg}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-white/10 bg-[#1b2027] flex items-center justify-between">
                    <span
                        className="text-xs text-gray-400">Her satır için hem erkek hem kadın kategorisi oluşturulur.</span>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                                className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253] text-white/90"
                                type="button">
                            Vazgeç
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={submitting}
                            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-60 inline-flex items-center gap-2"
                            type="button"
                        >
                            {submitting && <span
                                className="inline-block h-4 w-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"/>}
                            {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
                        </button>
                    </div>
                </div>
            </div>

            {result && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setResult(null)}/>
                    <div
                        className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-[#2a2f37] border border-white/10 p-6">
                        <div className="text-lg font-semibold mb-3">İçe Aktarma Sonucu</div>
                        <ul className="space-y-1 text-sm text-gray-200">
                            <li>Alt turnuva: <b>{result.created_subtournaments}</b></li>
                            <li>Maç oluşturuldu: <b>{result.created_matches}</b></li>
                            <li>Renumbered: <b>{result.renumbered}</b></li>
                            <li>Geçersiz lisans satırı: <b>{result.invalid_license_rows}</b></li>
                            <li>Zorunlu eksik nedeniyle düşen: <b>{result.dropped_rows_missing_required}</b></li>
                            <li>Kullanılan/Oluşturulan kulüp: <b>{result.clubs_created_or_used}</b></li>
                        </ul>

                        {result.cleaning_report?.base64 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        const b64 = result.cleaning_report.base64 as string;
                                        const fname = result.cleaning_report.filename || 'import_cleaning_report.xlsx';
                                        const bin = atob(b64);
                                        const bytes = new Uint8Array(bin.length);
                                        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                                        const blob = new Blob([bytes], {type: result.cleaning_report.content_type || 'application/octet-stream'});
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fname;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                                >
                                    Temizlik Raporunu İndir (XLSX)
                                </button>
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => {
                                setResult(null);
                                onImported();
                                onClose();
                            }} className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253]">
                                Tamam
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
        @keyframes progress { 0%{transform:translateX(-120%)} 50%{transform:translateX(20%)} 100%{transform:translateX(120%)} }
      `}</style>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Single Row + çoklu seçim
   ────────────────────────────────────────────────────────────────────────── */
function Row({
                 item,
                 onChanged,
                 canManage,
                 selected,
                 onToggleSelect,
             }: {
    item: SubTournament;
    onChanged: () => void;
    canManage: boolean;
    selected: boolean;
    onToggleSelect: (slug: string) => void;
}) {
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const goView = () => nav(`/bracket/${item.public_slug}`);
    const goEdit = () =>
        nav(`/create?mode=sub&edit=${encodeURIComponent(item.public_slug)}&parent=${item.tournament}`);

    const gender = String(item.gender || '').toUpperCase() === 'M' ? 'Male'
        : String(item.gender || '').toUpperCase() === 'F' ? 'Female' : 'Mixed';

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
                onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.button === 1) {
                        const url = `/bracket/${item.public_slug}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } else {
                        goView();
                    }
                }}
                onMouseDown={(e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        const url = `/bracket/${item.public_slug}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    const url = `/bracket/${item.public_slug}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') goView();
                }}
                className={`group relative p-4 rounded-lg bg-[#2d3038] border cursor-pointer transition
                   focus:outline-none flex items-center justify-between gap-3
                   ${
                    selected
                        ? 'border-emerald-400/80 shadow-[0_0_0_2px_rgba(16,185,129,.55),0_0_22px_6px_rgba(168,85,247,.35),0_0_16px_4px_rgba(16,185,129,.35)] bg-emerald-500/5'
                        : 'border-white/10 hover:border-emerald-400/50 hover:shadow-[0_0_0_2px_rgba(16,185,129,.45),0_0_22px_6px_rgba(168,85,247,.28),0_0_16px_4px_rgba(16,185,129,.28)]'
                }`}
            >
                {/* SOL: seçim + içerik */}
                <div className="pr-3 flex items-start gap-4 flex-1 min-w-0">
                    <div
                        onClick={(e) => {
                            if (!canManage) return;
                            e.stopPropagation();
                            onToggleSelect(item.public_slug);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl select-none transition
                        ${
                            canManage
                                ? selected
                                    ? 'bg-emerald-500/40 text-emerald-50 ring-2 ring-emerald-300 shadow-lg'
                                    : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                        title={
                            canManage
                                ? (selected ? 'Seçimi kaldır' : 'Alt turnuvayı seç')
                                : undefined
                        }
                    >
                        {canManage ? '🏆' : '🏆'}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{item.title}</div>
                        <div className="text-sm text-white/60 flex flex-wrap items-center gap-2 truncate">
                            <span className="truncate">
                                {gender} · Age {Number(item.age_min || 0)}–{Number(item.age_max || 0)} · Weight {(item.weight_min || '?') + '–' + (item.weight_max || '?')}
                            </span>
                            {selected && canManage && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                                    Seçili
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* SAĞ: chip + menü */}
                <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
                    <span
                        className={`px-2 py-1 rounded text-xs border border-white/10 ${badge.chip}`}>{badge.text}</span>

                    {canManage && (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen((v) => !v);
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0d1117] text-white/90 border border-white/10 ring-1 ring-white/5
                           shadow-inner hover:border-emerald-400/40 hover:ring-emerald-400/30 flex items-center justify-center"
                                aria-haspopup="menu" aria-expanded={open} title="İşlemler" type="button"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="6" cy="12" r="1.7" fill="currentColor"/>
                                    <circle cx="12" cy="12" r="1.7" fill="currentColor"/>
                                    <circle cx="18" cy="12" r="1.7" fill="currentColor"/>
                                </svg>
                            </button>
                            {open && (
                                <div role="menu"
                                     className="absolute right-0 mt-2 w-44 rounded-lg bg-[#1f232a] border border-white/10 shadow-xl z-20"
                                     onMouseLeave={() => setOpen(false)} onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => {
                                        setOpen(false);
                                        goEdit();
                                    }}
                                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-emerald-300"
                                            role="menuitem" type="button">✏️ Düzenle
                                    </button>
                                    <button onClick={() => {
                                        setOpen(false);
                                        setConfirmOpen(true);
                                    }}
                                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-red-300"
                                            role="menuitem" type="button">🗑️ Sil
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {confirmOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center"
                     onClick={() => setConfirmOpen(false)} role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60"/>
                    <div
                        className="relative z-10 w-[min(92vw,540px)] rounded-2xl bg-[#2a2d34] border border:white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="text-base font-semibold text-white mb-1">Silmek istediğinize emin misiniz?
                            </div>
                            <p className="text-sm text-white/80 mb-4">“{item.title}” geri alınamaz şekilde
                                silinecek.</p>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setConfirmOpen(false)}
                                        className="px-4 py-2 rounded bg-[#3b4252] hover:bg-[#454d62] text-white/90"
                                        type="button">Vazgeç
                                </button>
                                <button onClick={confirmDelete} disabled={deleting}
                                        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60"
                                        type="button">
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
   Ana Sayfa
   ────────────────────────────────────────────────────────────────────────── */
export default function TournamentSubListPage() {
    const {public_slug} = useParams<{ public_slug: string }>();
    const [sp] = useSearchParams();
    const parentIdFromQuery = Number(sp.get('parent') || '');
    const parentId = Number.isFinite(parentIdFromQuery) ? parentIdFromQuery : undefined;

    const {data, isLoading, isError, error, refetch} = useSubTournaments(public_slug);

    const [filters, setFilters] = useState<SubFilters>({
        status: 'all',
        gender: 'all',
        ageCategory: 'all',
        weightMin: '',
        weightMax: '',
    });

    const [statusMap, setStatusMap] = useState<Record<string, Phase>>({});
    const [sort, setSort] = useState<SortKey>('alpha');
    const [q, setQ] = useState('');
    const [canManage, setCanManage] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showShuffle, setShowShuffle] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Çoklu seçim
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
    const selectedCount = selectedSlugs.length;
    const [showCloneModal, setShowCloneModal] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!public_slug) {
                setCanManage(false);
                return;
            }
            try {
                const {data} = await api.get(`tournaments/${encodeURIComponent(public_slug)}/`);
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

    // canManage false olursa seçimi temizle
    useEffect(() => {
        if (!canManage && selectedSlugs.length) {
            setSelectedSlugs([]);
        }
    }, [canManage, selectedSlugs.length]);

    const handleToggleSelect = (slug: string) => {
        if (!canManage) return;
        setSelectedSlugs(prev =>
            prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
        );
    };
    const clearSelection = () => setSelectedSlugs([]);

    // Toplu SIL
    const handleBulkDelete = async () => {
        if (!selectedCount) return;
        const ok = window.confirm(`Seçili ${selectedCount} alt turnuvayı silmek istediğinizden emin misiniz?`);
        if (!ok) return;
        try {
            for (const slug of selectedSlugs) {
                await api.delete(`subtournaments/${encodeURIComponent(slug)}/`);
            }
            setSelectedSlugs([]);
            refetch();
        } catch {
            alert('Toplu silme sırasında hata oluştu.');
        }
    };

    // Toplu BAŞLAT
    const handleBulkStart = async () => {
        if (!selectedCount) return;
        const ok = window.confirm(`Seçili ${selectedCount} alt turnuvayı başlatmak istediğinizden emin misiniz?`);
        if (!ok) return;
        try {
            for (const slug of selectedSlugs) {
                await api.patch(`subtournaments/${encodeURIComponent(slug)}/`, { started: true });
            }
            refetch();
        } catch {
            alert('Toplu başlatma sırasında hata oluştu.');
        }
    };

    // Toplu KLON aç
    const handleBulkClone = () => {
        if (!selectedCount) return;
        setShowCloneModal(true);
    };

    useEffect(() => {
        if (filters.status === 'all' || !data?.length) return;
        const candidates = (data as SubTournament[]).filter((s) => {
            const hasInline = ('started' in (s as any)) || ('finished' in (s as any));
            const cached = statusMap[s.public_slug];
            return !hasInline && !cached;
        });
        if (!candidates.length) return;
        const pick = candidates.slice(0, 12);
        Promise.all(
            pick.map(async (s) => {
                try {
                    const {data: detail} = await api.get(`subtournaments/${encodeURIComponent(s.public_slug)}/`);
                    return [s.public_slug, inferPhaseFromDetail(detail)] as const;
                } catch {
                    return [s.public_slug, 'pending'] as const;
                }
            })
        ).then((entries) => {
            setStatusMap((prev) => {
                const next = {...prev};
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
        const base = (data ?? []).filter((s) => !q ? true : s.title.toLowerCase().includes(q.toLowerCase()));
        const byStatus = base.filter((s) => filters.status === 'all' ? true : getPhaseFromItemOrCache(s, statusMap) === filters.status);
        const byGender = byStatus.filter((s) => filters.gender === 'all' ? true : String(s.gender || '').toUpperCase() === filters.gender);
        const byAge = filters.ageCategory === 'all'
            ? byGender
            : byGender.filter((s) => inCategory(s, filters.ageCategory as AgeCatKey));

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
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-0">
            <div className="lg:flex lg:gap-6">
                {/* SOL SİDEBAR */}
                <aside className="hidden lg:block w-[280px] shrink-0">
                    <div className="lg:sticky lg:top-20">
                        <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug}/>
                    </div>
                </aside>

                {/* SAĞ İÇERİK */}
                <div className="flex-1">
                    {/* mobil toolbar */}
                    <div className="lg:hidden pt-4">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 text-sm"
                            type="button"
                        >
                            <span className="text-base">☰</span> Filtreler
                        </button>
                    </div>

                    {/* top bar */}
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
                        <div className="min-w-0">
                            <h2 className="text-xl font-semibold">Tüm Alt Turnuvalar</h2>
                            <p className="text-sm text-gray-400">Toplam <b>{data?.length ?? 0}</b> alt turnuva</p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className="relative w-full sm:w-56">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Hızlı ara (başlık)…"
                                    className="w-full bg-gray-700/70 px-3 py-2 rounded text-sm placeholder:text-gray-300"
                                    aria-label="Alt turnuva ara"
                                />
                                {q && (
                                    <button onClick={() => setQ('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                                            type="button">✕</button>
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

                            {canManage && public_slug && (
                                <>
                                    <button
                                        onClick={() => setShowShuffle(true)}
                                        className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-white text-sm shadow inline-flex items-center gap-2"
                                        title="Seçtiğin gün için, başlamamış tüm alt turnuvalarda yerleşimi aynı anda karıştır"
                                        type="button"
                                    >
                                        Toplu Kura
                                    </button>
                                    <button
                                        onClick={() => setShowImport(true)}
                                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm shadow"
                                    >
                                        Excel’den Aktar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* TOPLU İŞLEM BAR */}
                    {canManage && selectedCount > 0 && (
                        <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-sm text-emerald-100">
                                <span className="font-semibold">{selectedCount}</span> alt turnuva seçildi.
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white text-xs sm:text-sm"
                                    type="button"
                                >
                                    🗑️ Sil
                                </button>
                                <button
                                    onClick={handleBulkStart}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm"
                                    type="button"
                                >
                                    🚀 Turnuvayı Başlat
                                </button>
                                <button
                                    onClick={handleBulkClone}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm"
                                    type="button"
                                >
                                    🎯 Alt Turnuvayı Klonla
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-1.5 rounded-lg bg-[#313844] hover:bg-[#394253] text-white/90 text-xs sm:text-sm"
                                    type="button"
                                >
                                    Seçimi Temizle
                                </button>
                            </div>
                        </div>
                    )}

                    {/* content states */}
                    {isLoading && <SkeletonList/>}
                    {isError && (() => {
                        const code = errorStatus;
                        if (code === 401) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div
                                        className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-2xl">🔒
                                    </div>
                                    <div className="text-amber-200 font-semibold mb-1">Erişim kısıtlı (401)</div>
                                    <p className="text-sm text-gray-300 mb-4">Bu sayfayı görüntülemek için oturum açın
                                        ya da organizatörden yetki isteyin.</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/"
                                              className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">←
                                            Dashboard</Link>
                                        <Link
                                            to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Giriş
                                            Yap →</Link>
                                    </div>
                                </div>
                            );
                        }
                        if (code === 403) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div
                                        className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-2xl">🚫
                                    </div>
                                    <div className="text-amber-200 font-semibold mb-1">Yetkiniz yok (403)</div>
                                    <p className="text-sm text-gray-300 mb-4">Bu turnuvanın alt turnuvalarını
                                        görüntüleme yetkiniz bulunmuyor.</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/"
                                              className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">←
                                            Dashboard</Link>
                                    </div>
                                </div>
                            );
                        }
                        if (code === 404) {
                            return (
                                <div className="mt-2 rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center">
                                    <div
                                        className="mx-auto mb-4 w-12 h-12 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-2xl">❓
                                    </div>
                                    <div className="text-violet-200 font-semibold mb-1">Turnuva bulunamadı (404)</div>
                                    <p className="text-sm text-gray-300 mb-4">Böyle bir turnuva yok ya da erişiminiz
                                        yok.</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Link to="/"
                                              className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">←
                                            Dashboard</Link>
                                        <Link
                                            to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Giriş
                                            Yap →</Link>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="mt-2 rounded-lg bg-[#2a2d34] border border-red-500/30 p-6 space-y-2">
                                <p className="text-red-300 font-semibold">Veri alınamadı.</p>
                                <p className="text-sm text-gray-300">{error instanceof Error ? error.message : 'Bilinmeyen hata.'}</p>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => refetch()}
                                            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                                            type="button">Tekrar Dene
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {!isLoading && !isError && (
                        <>
                            {!list.length ? (
                                <div className="rounded-lg border border-white/10 bg-[#2a2d34] p-8 text-center">
                                    <div className="text-lg font-semibold mb-2">Henüz alt turnuvalanız yok</div>
                                    <p className="text-sm text-gray-300 mb-5">Oluşturmak ister misiniz?</p>
                                    {canManage && (parentId ? (
                                        <Link to={`/create?mode=sub&parent=${parentId}`}
                                              className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Alt
                                            Turnuva Oluştur</Link>
                                    ) : (
                                        <Link to="/create?mode=sub"
                                              className="inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Alt
                                            Turnuva Oluştur</Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4 pb-8">
                                    {(() => {
                                        const byDay = new Map<string | 'none', SubWithDay[]>();
                                        for (const s of list as SubWithDay[]) {
                                            const raw = (s.day || '').trim();
                                            const key = raw && raw !== DAY_SENTINEL ? raw : ('none' as const);
                                            const arr = byDay.get(key) || [];
                                            arr.push(s);
                                            byDay.set(key, arr);
                                        }

                                        const orderedDays = [...byDay.entries()].sort(([a], [b]) => {
                                            if (a === 'none') return 1;
                                            if (b === 'none') return -1;
                                            return new Date(a).getTime() - new Date(b).getTime();
                                        });

                                        return (
                                            <div className="space-y-10 pb-8">
                                                {orderedDays.map(([dayKey, dayItems]) => {
                                                    const dayLabel = dayKey === 'none' ? 'TARİH ATANMAMIŞ' : formatDayLabel(dayKey);

                                                    const byCourt = new Map<number | 'none', SubWithDay[]>();
                                                    for (const s of dayItems) {
                                                        const k = Number.isFinite(s.court_no as any) ? (s.court_no as number) : ('none' as const);
                                                        const arr = byCourt.get(k) || [];
                                                        arr.push(s);
                                                        byCourt.set(k, arr);
                                                    }
                                                    const orderedCourts = [...byCourt.entries()].sort(([a], [b]) => {
                                                        if (a === 'none') return 1;
                                                        if (b === 'none') return -1;
                                                        return (a as number) - (b as number);
                                                    });

                                                    return (
                                                        <section key={String(dayKey)}>
                                                            {/* Gün başlığı */}
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                border border-white/10
                bg-gradient-to-r from-violet-600/25 via-violet-500/15 to-violet-400/10
                text-violet-200/95
                shadow-[0_0_0_1px_rgba(255,255,255,.06),0_6px_18px_-6px_rgba(139,92,246,.35)]
                backdrop-blur-[2px]
              ">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                                                                        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                                                                        <path d="M8 3v4M16 3v4M3.5 10.5h17" stroke="currentColor" strokeWidth="1.6"/>
                                                                    </svg>
                                                                    <span className="text-[13px] font-semibold tracking-wide uppercase">
                                                                        {dayLabel}
                                                                    </span>
                                                                </span>
                                                                <span className="h-[1px] flex-1 rounded-full bg-gradient-to-r from-violet-400/40 via-white/10 to-transparent"/>
                                                            </div>

                                                            {/* Gün içi kort grupları */}
                                                            <div className="space-y-8">
                                                                {orderedCourts.map(([courtKey, arr]) => (
                                                                    <div key={String(courtKey)}>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                        <span className="
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                      border border-white/10
                      bg-gradient-to-r from-emerald-600/25 via-emerald-500/15 to-emerald-400/10
                      text-emerald-200/95
                      shadow-[0_0_0_1px_rgba(255,255,255,.06),0_6px_18px_-6px_rgba(16,185,129,.35)]
                      backdrop-blur-[2px]
                    ">
                                                                          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                                                                              <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                                                                              <path d="M12 6v12M3 12h18" stroke="currentColor" strokeWidth="1.6"/>
                                                                          </svg>
                                                                          <span className="text-[13px] font-semibold tracking-wide uppercase">
                        {courtKey === 'none' ? 'KORT ATANMAMIŞ' : `KORT-${courtKey}`}
                      </span>
                                                                        </span>
                                                                            <span className="h-[1px] flex-1 rounded-full bg-gradient-to-r from-emerald-400/40 via-white/10 to-transparent"/>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            {arr.map((s) => (
                                                                                <Row
                                                                                    key={s.id}
                                                                                    item={s}
                                                                                    onChanged={refetch}
                                                                                    canManage={canManage}
                                                                                    selected={selectedSlugs.includes(s.public_slug)}
                                                                                    onToggleSelect={handleToggleSelect}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Mobil filtre çekmecesi */}
            {drawerOpen && (
                <div className="fixed inset-0 z-[85] lg:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)}/>
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[min(86vw,360px)] bg-[#1c2027] border-r border-white/10 p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">Filtreler</div>
                            <button onClick={() => setDrawerOpen(false)} className="text-gray-300 hover:text-white"
                                    type="button">✕
                            </button>
                        </div>
                        <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug}/>
                    </div>
                </div>
            )}

            {showImport && public_slug && (
                <ImportModal
                    publicSlug={public_slug}
                    onImported={refetch}
                    onClose={() => setShowImport(false)}
                />
            )}

            {/* Toplu Kura (Gün) modal */}
            {showShuffle && public_slug && (
                <ShuffleDayModal
                    open={showShuffle}
                    slug={public_slug}
                    onClose={() => setShowShuffle(false)}
                    onDone={() => {
                        setShowShuffle(false);
                        refetch();
                    }}
                />
            )}

            {/* Toplu Klonlama modalı */}
            {showCloneModal && canManage && (
                <BulkCloneModal
                    open={showCloneModal}
                    selectedCount={selectedSlugs.length}
                    selectedSlugs={selectedSlugs}
                    onClose={() => setShowCloneModal(false)}
                    onDone={() => {
                        setShowCloneModal(false);
                        setSelectedSlugs([]);
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
            {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-[#2a2d34] border border-white/5 relative overflow-hidden">
                    <div
                        className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent"/>
                </div>
            ))}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ShuffleDay Modal
   ────────────────────────────────────────────────────────────────────────── */
function ShuffleDayModal({
                             open,
                             slug,
                             onClose,
                             onDone,
                         }: {
    open: boolean;
    slug: string;
    onClose: () => void;
    onDone: () => void;
}) {
    const [day, setDay] = useState<string>(() => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    });
    const [seed, setSeed] = useState<string>('');
    const [phase, setPhase] = useState<'idle' | 'countdown' | 'posting' | 'success' | 'error'>('idle');
    const [count, setCount] = useState<number>(3);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    if (!open) return null;

    const startCountdown = () => {
        if (!day) return;
        setErr(null);
        setPhase('countdown');
        setCount(3);

        let i = 3;
        const id = window.setInterval(() => {
            i -= 1;
            setCount(i);
            if (i <= 0) {
                window.clearInterval(id);
                doPost();
            }
        }, 800);
    };

    const doPost = async () => {
        setPhase('posting');
        try {
            await api.post(
                `tournaments/${encodeURIComponent(slug)}/shuffle-day/`,
                null,
                { params: { day, seed: seed || undefined } }
            );
            setPhase('success');
            setTimeout(() => {
                onDone();
            }, 1000);
        } catch (e: any) {
            const msg = e?.response?.data?.detail || 'İşlem başarısız oldu.';
            setErr(String(msg));
            setPhase('error');
        }
    };

    const disabled = phase !== 'idle';

    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60" onClick={phase === 'idle' ? onClose : undefined} />
            <div
                className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-[#1e232b] border border-white/10 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="text-white font-semibold">Toplu Kura Çek (Gün)</div>
                    <button
                        onClick={onClose}
                        disabled={phase !== 'idle'}
                        className="text-gray-300 hover:text-white disabled:opacity-40"
                        aria-label="Kapat"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Tarih</label>
                        <input
                            type="date"
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-[#0f141a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Bu tarihteki <b>başlamamış</b> tüm alt turnuvalar aynı anda karıştırılır. Aynı kulüp çakışmaları
                            minimize edilir.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Opsiyonel seed (deterministik)</label>
                        <input
                            placeholder="(boş bırakılabilir)"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-[#0f141a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                        />
                    </div>

                    {phase === 'countdown' && (
                        <div className="mt-2 flex items-center justify-center">
                            <div className="text-5xl font-extrabold text-emerald-300 drop-shadow-lg select-none">
                                {count > 0 ? count : '…'}
                            </div>
                        </div>
                    )}

                    {phase === 'posting' && (
                        <div className="mt-2 flex items-center justify-center text-emerald-200 gap-2">
                            <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            Kura çekiliyor…
                        </div>
                    )}

                    {phase === 'success' && (
                        <div className="mt-2 text-center">
                            <div className="text-emerald-300 font-semibold text-lg">Kura başarıyla çekildi 🎉</div>
                            <div className="text-xs text-gray-400">Pencere otomatik kapanacak…</div>
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
                            {err}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-white/10 bg-[#171b22] flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={phase !== 'idle'}
                        className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253] text-white/90 disabled:opacity-60"
                        type="button"
                    >
                        Kapat
                    </button>

                    {phase === 'idle' && (
                        <button
                            onClick={startCountdown}
                            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                            type="button"
                            disabled={!day}
                        >
                            Kura Çek
                        </button>
                    )}

                    {phase === 'error' && (
                        <button
                            onClick={() => { setPhase('idle'); setErr(null); }}
                            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                            type="button"
                        >
                            Tekrar Dene
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Bulk Clone Modal
   ────────────────────────────────────────────────────────────────────────── */

type TournamentOption = {
    id?: number;
    public_slug: string;
    title?: string;
    name?: string;
    can_edit?: boolean;
    [k: string]: any;
};

function BulkCloneModal({
                            open,
                            selectedCount,
                            selectedSlugs,
                            onClose,
                            onDone,
                        }: {
    open: boolean;
    selectedCount: number;
    selectedSlugs: string[];
    onClose: () => void;
    onDone: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [options, setOptions] = useState<TournamentOption[]>([]);
    const [targetSlug, setTargetSlug] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get('tournaments/')
            .then(({ data }) => {
                if (cancelled) return;
                const arr = Array.isArray(data) ? data as TournamentOption[] : [];
                // yalnızca editleyebildikleri
                const editable = arr.filter(t => t.can_edit || t.is_owner || t.is_editor);
                setOptions(editable);
                setTargetSlug(editable[0]?.public_slug || '');
            })
            .catch(() => {
                if (!cancelled) return;
                setError('Turnuvalar yüklenemedi.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    if (!open) return null;

    const doClone = async () => {
        if (!targetSlug) {
            setError('Lütfen hedef ana turnuvayı seçin.');
            return;
        }
        setPosting(true);
        setError(null);
        try {
            for (const slug of selectedSlugs) {
                await api.post(
                    `subtournaments/${encodeURIComponent(slug)}/clone/`,
                    { target_tournament_slug: targetSlug }
                );
            }
            onDone();
        } catch (e: any) {
            const msg = e?.response?.data?.detail || 'Klonlama sırasında hata oluştu.';
            setError(String(msg));
        } finally {
            setPosting(false);
        }
    };

    const disableConfirm = posting || loading || !targetSlug || !options.length;

    return (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60" onClick={posting ? undefined : onClose} />
            <div
                className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-[#1e232b] border border-white/10 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="text-white font-semibold">Alt Turnuvaları Klonla</div>
                    <button
                        onClick={onClose}
                        disabled={posting}
                        className="text-gray-300 hover:text-white disabled:opacity-40"
                        aria-label="Kapat"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    <p className="text-sm text-gray-300">
                        <b>{selectedCount}</b> alt turnuva seçtiniz. Bunları hangi ana turnuvaya klonlamak istersiniz?
                    </p>

                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-200">
                            <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            Turnuvalar yükleniyor…
                        </div>
                    ) : options.length === 0 ? (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-sm">
                            Düzenleyebildiğiniz ana turnuva bulunamadı.
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm text-gray-200 mb-2">Hedef Ana Turnuva</label>
                            <select
                                value={targetSlug}
                                onChange={(e) => setTargetSlug(e.target.value)}
                                className="w-full bg-[#0f141a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                            >
                                {options.map((t) => (
                                    <option key={t.public_slug} value={t.public_slug}>
                                        {t.title || t.name || t.public_slug}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-100 px-3 py-2 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-white/10 bg-[#171b22] flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={posting}
                        className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253] text-white/90 disabled:opacity-60"
                        type="button"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={doClone}
                        disabled={disableConfirm}
                        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                        type="button"
                    >
                        {posting && (
                            <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        )}
                        Klonla
                    </button>
                </div>
            </div>
        </div>
    );
}
