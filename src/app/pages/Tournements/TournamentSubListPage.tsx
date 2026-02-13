// src/app/pages/Tournements/TournamentSubListPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSubTournaments, type SubTournament } from '../../hooks/useSubTournaments';
import SubFilterSidebar, { type SubFilters } from './components/SubFilterSidebar';
import { api } from '../../lib/api';
import { TurnuvaEmblem } from '../../components/TurnuvaEmblem';
import { EliteSelect } from '../../components/EliteSelect';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
type SortKey = 'alpha' | 'created' | 'age' | 'weight';
type Phase = 'pending' | 'in_progress' | 'completed';
type AgeCatKey = 'kucukler' | 'minikler' | 'yildizlar' | 'gencler' | 'umitler' | 'buyukler';
const AGE_CATEGORIES: Record<AgeCatKey, { min: number; max: number | null }> = {
    kucukler: { min: 0, max: 10 },
    minikler: { min: 10, max: 13 },
    yildizlar: { min: 13, max: 15 },
    gencler: { min: 15, max: 18 },
    umitler: { min: 18, max: 20 },
    buyukler: { min: 18, max: null },
};
type GenderKey = 'M' | 'F';

// Her yaş kategorisi + cinsiyet için ön tanımlı sikletler
const WEIGHT_PRESETS: Record<AgeCatKey, { M: string[]; F: string[] }> = {
    buyukler: {
        M: ['54', '58', '63', '68', '74', '80', '87', '87+'],
        F: ['46', '49', '53', '57', '62', '67', '73', '73+'],
    },
    umitler: {
        M: ['54', '58', '63', '68', '74', '80', '87', '87+'],
        F: ['46', '49', '53', '57', '62', '67', '73', '73+'],
    },
    gencler: {
        M: ['45', '48', '51', '55', '59', '63', '68', '73', '78', '78+'],
        F: ['42', '44', '46', '49', '52', '55', '59', '63', '68', '68+'],
    },
    yildizlar: {
        M: ['33', '37', '41', '45', '49', '53', '57', '61', '65', '65+'],
        F: ['29', '33', '37', '41', '44', '47', '51', '55', '59', '59+'],
    },
    minikler: {
        M: ['27', '30', '33', '36', '40', '45', '50', '57', '57+'],
        F: ['27', '30', '33', '36', '40', '45', '50', '57', '57+'],
    },
    kucukler: {
        M: ['27', '30', '33', '36', '40', '45', '50', '57', '57+'],       // +57 → 57
        F: ['27', '30', '33', '36', '40', '45', '50', '57', '57+'],
    },
};

const AGE_LABELS: Record<AgeCatKey, string> = {
    kucukler: 'Küçükler',
    minikler: 'Minikler',
    yildizlar: 'Yıldızlar',
    gencler: 'Gençler',
    umitler: 'Ümitler',
    buyukler: 'Büyükler',
};

function trGenderLabel(g: unknown) {
    const x = String(g || '').toUpperCase();
    if (x === 'M') return 'Erkek';
    if (x === 'F') return 'Kadın';
    return 'Karma';
}

function ageCategoryLabelFromMinMax(ageMin: unknown, ageMax: unknown) {
    const lo = Number(ageMin);
    const hiNum = Number(ageMax);
    const hi = Number.isFinite(hiNum) ? hiNum : Infinity;

    // 1) Tam eşleşme (en güvenlisi)
    for (const k of Object.keys(AGE_CATEGORIES) as AgeCatKey[]) {
        const c = AGE_CATEGORIES[k];
        const cMax = c.max ?? Infinity;
        if (c.min === lo && cMax === hi) return AGE_LABELS[k];
    }

    // 2) İçerme (backend bazen 200 gibi "üst sınır" döndürür)
    for (const k of Object.keys(AGE_CATEGORIES) as AgeCatKey[]) {
        const c = AGE_CATEGORIES[k];
        const cMax = c.max ?? Infinity;
        if (Number.isFinite(lo) && lo >= c.min && hi <= cMax) return AGE_LABELS[k];
    }

    // 3) Fallback
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi !== Infinity) return `Yaş ${lo}–${hi}`;
    if (Number.isFinite(lo)) return `Yaş ${lo}+`;
    return 'Yaş';
}

function weightLabelMaxOnly(s: SubTournament) {
    // Eğer backend/model "weight" stringini (87+) taşıyorsa direkt onu göster
    const raw = (s as any).weight;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();

    const wmin = parseNum((s as any).weight_min, NaN);
    const wmax = parseNum((s as any).weight_max, NaN);

    // Normal sınıflar: sadece max göster (örn: 74)
    if (Number.isFinite(wmax) && wmax > 0 && wmax < 200) return String(wmax);

    // Açık uç (+) sınıflar: min+
    if (Number.isFinite(wmin) && wmin > 0) return `${wmin}+`;

    // Fallback
    if (Number.isFinite(wmax) && wmax > 0) return String(wmax);
    return '?';
}

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
    pending: { text: 'Bekleyen', chip: 'bg-amber-500/20 text-amber-200' },
    in_progress: { text: 'Başlayan', chip: 'bg-emerald-600/20 text-emerald-300' },
    completed: { text: 'Biten', chip: 'bg-red-600/20 text-red-200' },
} as const;

/* ──────────────────────────────────────────────────────────────────────────
   IMPORT MODAL
   ────────────────────────────────────────────────────────────────────────── */
type RefereeMini = { id: number; username: string };

type ImportConfig = {
    key: string;
    day: string;
    court: string;
    ageKey: AgeCatKey;
    gender: GenderKey;
    selectedWeights: string[];
    isPublic: boolean; // ✅ YENİ (default true)

    // Hakem alanları (satır bazlı)
    referees: RefereeMini[];
    refInput: string;
    refFeedback: string | null;
    busyRef: boolean;
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
    const todayIso = () => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    };

    const parseCourts = (raw: string) => {
        const parts = String(raw || '')
            .split(/[,; ]+/)
            .map((x) => x.trim())
            .filter(Boolean);
        const nums = parts
            .map((x) => parseInt(x, 10))
            .filter((n) => Number.isFinite(n) && n > 0);
        // uniq + sort
        return [...new Set(nums)].sort((a, b) => a - b);
    };

    const [file, setFile] = useState<File | null>(null);
    const [configs, setConfigs] = useState<ImportConfig[]>(() => [
        {
            key: safeUUID(),
            day: todayIso(),
            court: '1',
            ageKey: 'gencler',
            gender: 'M',
            selectedWeights: [],
            referees: [],
            refInput: '',
            refFeedback: null,
            busyRef: false,
            isPublic: true,
        },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);

    const addConfig = () => {
        const baseDay = configs[0]?.day || todayIso();
        setConfigs((prev) => [
            ...prev,
            {
                key: safeUUID(),
                day: baseDay,
                court: '1',
                ageKey: 'gencler',
                gender: 'M',
                selectedWeights: [],
                referees: [],
                refInput: '',
                refFeedback: null,
                busyRef: false,
                isPublic: true,
            },
        ]);
    };

    const removeConfig = (idx: number) => {
        setConfigs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    };

    const updateConfig = (idx: number, patch: Partial<ImportConfig>) => {
        setConfigs((prev) =>
            prev.map((cfg, i) => (i === idx ? { ...cfg, ...patch } : cfg)),
        );
    };

    const weightUsedSomewhereElse = (
        ageKey: AgeCatKey,
        gender: GenderKey,
        weight: string,
        selfKey: string,
    ) => {
        // Aynı sikletin birden fazla korta bölünmesine izin veriyoruz.
        // (Kort alanına: "1,2,3" yazarak dağıtabilirsiniz.)
        void ageKey; void gender; void weight; void selfKey;
        return false;
    };

    const toggleWeight = (idx: number, weight: string) => {
        setConfigs((prev) =>
            prev.map((cfg, i) => {
                if (i !== idx) return cfg;
                const selected = cfg.selectedWeights.includes(weight);
                return {
                    ...cfg,
                    selectedWeights: selected
                        ? cfg.selectedWeights.filter((w) => w !== weight)
                        : [...cfg.selectedWeights, weight],
                };
            }),
        );
    };

    const patchConfigByKey = (key: string, fn: (c: ImportConfig) => ImportConfig) => {
        setConfigs(prev => prev.map(c => (c.key === key ? fn(c) : c)));
    };

    async function addRefereeForRow(rowKey: string) {
        const cfgNow = configs.find(c => c.key === rowKey);
        const u = (cfgNow?.refInput || '').trim();

        patchConfigByKey(rowKey, c => ({ ...c, refFeedback: null }));

        if (!u) return;

        patchConfigByKey(rowKey, c => ({ ...c, busyRef: true, refFeedback: null }));

        try {
            const { data } = await api.get<{ id: number }>(
                `users/lookup/${encodeURIComponent(u)}/`
            );
            const uid = typeof data?.id === 'number' ? data.id : -1;

            patchConfigByKey(rowKey, c => {
                if (uid <= 0) return { ...c, refFeedback: 'Kullanıcı bulunamadı.' };

                const exists = c.referees.some(
                    r => r.id === uid || r.username.toLowerCase() === u.toLowerCase()
                );
                if (exists) return { ...c, refFeedback: 'Bu kullanıcı zaten hakem listesinde.' };

                return {
                    ...c,
                    referees: [...c.referees, { id: uid, username: u }],
                    refInput: '',
                    refFeedback: null,
                };
            });
        } catch {
            patchConfigByKey(rowKey, c => ({ ...c, refFeedback: 'Sunucu hatası, tekrar deneyin.' }));
        } finally {
            patchConfigByKey(rowKey, c => ({ ...c, busyRef: false }));
        }
    }

    function removeRefereeFromRow(rowKey: string, uid: number) {
        patchConfigByKey(rowKey, c => ({
            ...c,
            referees: c.referees.filter(r => r.id !== uid),
            refFeedback: null,
        }));
    }


    async function onSubmit() {
        setMsg(null);
        if (!file) {
            setMsg('Lütfen bir Excel (XLSX) dosyası seçin.');
            return;
        }

        if (!configs.length) {
            setMsg('En az bir satır (gün/kort/kategori) ekleyin.');
            return;
        }

        // Aynı yaş+kilo+cinsiyet (ve gün) birden fazla satırda seçilirse:
        // duplicate alt turnuva yerine preferred_courts birleşsin.
        const categoriesByKey = new Map<string, any>();

        for (const cfg of configs) {
            const cat = AGE_CATEGORIES[cfg.ageKey];
            if (!cat) {
                setMsg('Geçersiz yaş kategorisi bulunan satır var.');
                return;
            }
            if (!cfg.day) {
                setMsg('Tüm satırlar için maç günü seçmelisiniz.');
                return;
            }
            const courts = parseCourts(cfg.court);
            if (!courts.length) {
                setMsg('Kort alanına en az bir pozitif numara girin. Örn: 1 veya 1,2,3');
                return;
            }
            if (!cfg.selectedWeights.length) {
                setMsg('Her satır için en az bir siklet seçmelisiniz.');
                return;
            }

            for (const w of cfg.selectedWeights) {
                const refIds = (cfg.referees || [])
                    .map(r => r.id)
                    .filter((id) => typeof id === 'number' && id > 0);

                const payload: any = {
                    age_min: cat.min,
                    age_max: cat.max ?? 200,
                    weight: w,
                    court_no: courts[0],
                    preferred_courts: courts,
                    gender: cfg.gender,
                    day: cfg.day,
                    ...(!cfg.isPublic ? { public: false } : {}),
                };

                if (refIds.length) payload.referees = refIds; // opsiyonel

                const refKey = refIds.slice().sort((a, b) => a - b).join(',');
                const key = [
                    cfg.day,
                    cfg.ageKey,
                    cfg.gender,
                    String(w),
                    cfg.isPublic ? 'public' : 'private',
                    refKey,
                ].join('|');

                const existing = categoriesByKey.get(key);
                if (existing) {
                    const merged = [...new Set([...(existing.preferred_courts || []), ...courts])]
                        .filter((n) => Number.isFinite(n) && n > 0)
                        .sort((a, b) => a - b);
                    existing.preferred_courts = merged;
                    existing.court_no = merged[0] ?? existing.court_no;
                } else {
                    categoriesByKey.set(key, payload);
                }
            }
        }

        const categories = [...categoriesByKey.values()];
        if (!categories.length) {
            setMsg('En az bir siklet seçmelisiniz.');
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('categories', JSON.stringify(categories));
            // Artık day satır bazlı geldiği için top-level day göndermeye gerek yok

            const { data } = await api.post(
                `tournaments/${encodeURIComponent(publicSlug)}/import-subtournaments/`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            setResult(data);
            setMsg(null);

            // Import sonrası maç numaralarını otomatik üret (tek tek kaydetme ihtiyacını kaldırır)
            try {
                const byDay = new Map<string, Set<number>>();
                for (const cfg of configs) {
                    const d = (cfg.day || '').trim();
                    if (!d) continue;
                    const set = byDay.get(d) || new Set<number>();
                    parseCourts(cfg.court).forEach((c) => set.add(c));
                    byDay.set(d, set);
                }
                for (const [d, set] of byDay.entries()) {
                    const courts = [...set].sort((a, b) => a - b);
                    const params =
                        courts.length > 1
                            ? { courts: courts.join(','), day: d }
                            : courts.length === 1
                                ? { court: courts[0], day: d }
                                : { day: d };
                    await api.post(
                        `tournaments/${encodeURIComponent(publicSlug)}/generate-match-numbers/`,
                        {},
                        { params },
                    );
                }
            } catch {
                // numara üretimi başarısız olsa da import başarılı olmalı
            }
        } catch (e: any) {
            const d = e?.response?.data?.detail;
            setMsg(typeof d === 'string' ? d : 'İçe aktarma başarısız oldu.');
        } finally {
            setSubmitting(false);
        }
    }

    const renderAgeLabel = (k: AgeCatKey, v: { min: number; max: number | null }) => {
        if (k === 'buyukler') return 'Büyükler';
        if (k === 'kucukler') return 'Küçükler';
        if (v.min === 10) return 'Minikler';
        if (v.min === 13) return 'Yıldızlar';
        if (v.min === 15) return 'Gençler';
        if (v.min === 18 && v.max === 20) return 'Ümitler';
        return 'Büyükler';
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative z-10 w-[min(92vw,920px)] max-h-[90vh] overflow-hidden rounded-2xl bg-premium-card border border-premium-border shadow-elite flex flex-col">
                {submitting && (
                    <div className="absolute left-0 top-0 h-0.5 w-full overflow-hidden">
                        <div className="h-full w-1/3 bg-emerald-400/80 animate-[progress_1.2s_ease-in-out_infinite]" />
                    </div>
                )}

                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="text-lg font-semibold text-white">Excel’den Alt Turnuva İçe Aktar</div>
                    <button onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Kapat">
                        ✕
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* 1) Excel dosyası */}
                    <div>
                        <div className="text-sm text-gray-300 mb-2">Excel Dosyası (XLSX)</div>
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
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

                    {/* 2–6) Gün / kort / kategori / cinsiyet / siklet seçimi */}
                    <div>
                        <div className="text-sm text-gray-300 mb-1">
                            Gün / Kort / Yaş Kategorisi / Cinsiyet / Siklet Seçimi
                        </div>
                        <div className="text-xs text-gray-400 mb-3">
                            Her satırda önce <b>maç günü</b> ve <b>kortu</b> seçin, ardından <b>yaş kategorisi</b> ve{' '}
                            <b>cinsiyete</b> göre uygun sikletleri işaretleyin. Aynı sikleti birden fazla korta dağıtmak için{' '}
                            <b> Kort</b> alanına virgülle yazabilirsiniz (örn: <b>1,2,3</b>).
                        </div>

                        <div className="space-y-4">
                            {configs.map((cfg, idx) => {
                                const weightsForCfg =
                                    WEIGHT_PRESETS[cfg.ageKey]?.[cfg.gender] ?? [];

                                return (
                                    <div
                                        key={cfg.key}
                                        className="rounded-xl border border-premium-border/50 bg-white/[0.02] p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm text-gray-200 font-semibold">
                                                Satır {idx + 1}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeConfig(idx)}
                                                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
                                                disabled={configs.length <= 1}
                                            >
                                                Sil
                                            </button>
                                        </div>

                                        {/* Gün + Kort + Kategori + Cinsiyet */}
                                        <div className="grid gap-3 md:grid-cols-4">
                                            <div>
                                                <div className="text-xs text-gray-300 mb-1">Gün</div>
                                                <input
                                                    type="date"
                                                    value={cfg.day}
                                                    onChange={(e) =>
                                                        updateConfig(idx, { day: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:border-premium-gold/50 focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-300 mb-1">Kort</div>
                                                <input
                                                    placeholder="1 veya 1,2,3"
                                                    value={cfg.court}
                                                    onChange={(e) =>
                                                        updateConfig(idx, {
                                                            court: e.target.value.replace(/[^\d,; ]/g, ''),
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:border-premium-gold/50 focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-300 mb-1">Yaş Kategorisi</div>
                                                <EliteSelect
                                                    value={cfg.ageKey}
                                                    onChange={(v) =>
                                                        updateConfig(idx, {
                                                            ageKey: v as AgeCatKey,
                                                            selectedWeights: [],
                                                        })
                                                    }
                                                    ariaLabel="Yaş kategorisi"
                                                    options={Object.entries(AGE_CATEGORIES).map(([k, v]) => ({
                                                        value: k,
                                                        label: renderAgeLabel(k as AgeCatKey, v),
                                                    }))}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-300 mb-1">Cinsiyet</div>
                                                <EliteSelect
                                                    value={cfg.gender}
                                                    onChange={(v) =>
                                                        updateConfig(idx, {
                                                            gender: v as GenderKey,
                                                            selectedWeights: [],
                                                        })
                                                    }
                                                    ariaLabel="Cinsiyet"
                                                    options={[
                                                        { value: 'M', label: 'Erkek' },
                                                        { value: 'F', label: 'Kadın' },
                                                    ]}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* ✅ Görünürlük */}
                                        <div>
                                            <div className="text-xs text-gray-300 mb-1">Görünürlük</div>
                                            <button
                                                type="button"
                                                onClick={() => updateConfig(idx, { isPublic: !cfg.isPublic })}
                                                className={[
                                                    "w-full px-3 py-2 rounded-lg border text-sm transition flex items-center justify-between",
                                                    cfg.isPublic
                                                        ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/20"
                                                        : "bg-red-500/10 border-red-400/30 text-red-100 hover:bg-red-500/15",
                                                ].join(" ")}
                                                aria-pressed={cfg.isPublic}
                                                title={cfg.isPublic ? "Herkese Açık" : "Özel"}
                                            >
                                                <span className="font-medium">
                                                    {cfg.isPublic ? "Herkese Açık" : "Özel"}
                                                </span>

                                                {/* küçük switch görseli */}
                                                <span
                                                    className={[
                                                        "relative inline-flex h-5 w-10 items-center rounded-full transition",
                                                        cfg.isPublic ? "bg-emerald-500/60" : "bg-red-500/60",
                                                    ].join(" ")}
                                                >
                                                    <span
                                                        className={[
                                                            "inline-block h-4 w-4 transform rounded-full bg-white transition",
                                                            cfg.isPublic ? "translate-x-5" : "translate-x-1",
                                                        ].join(" ")}
                                                    />
                                                </span>
                                            </button>
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                Özel seçilirse alt turnuva gizli oluşturulur.
                                            </div>
                                        </div>

                                        {/* Hakemler (opsiyonel) */}
                                        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-xs text-gray-300 font-semibold">Hakemler (opsiyonel)</div>
                                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                                        Bu satırdaki seçili tüm sikletlere uygulanır.
                                                    </div>
                                                </div>
                                                {cfg.referees.length > 0 && (
                                                    <div className="text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 px-2 py-1 rounded-full">
                                                        {cfg.referees.length} hakem
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        value={cfg.refInput}
                                                        onChange={(e) =>
                                                            updateConfig(idx, { refInput: e.target.value, refFeedback: null })
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addRefereeForRow(cfg.key);
                                                            }
                                                        }}
                                                        placeholder="Kullanıcı adı yaz (örn: hakem_ali)"
                                                        className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:border-premium-gold/50 focus:outline-none transition-all
                           placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => addRefereeForRow(cfg.key)}
                                                    disabled={cfg.busyRef || !cfg.refInput.trim()}
                                                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                                                    title="Kullanıcı adından hakem ekle"
                                                >
                                                    {cfg.busyRef && (
                                                        <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                                                    )}
                                                    Ekle
                                                </button>
                                            </div>

                                            {cfg.refFeedback && (
                                                <div className="mt-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/20 px-3 py-2 rounded-lg">
                                                    {cfg.refFeedback}
                                                </div>
                                            )}

                                            {cfg.referees.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {cfg.referees.map((r) => (
                                                        <span
                                                            key={r.id}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                               bg-white/5 border border-white/10 text-gray-100 text-xs"
                                                            title={`ID: ${r.id}`}
                                                        >
                                                            <span className="text-emerald-200">@{r.username}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRefereeFromRow(cfg.key, r.id)}
                                                                className="text-gray-300 hover:text-white"
                                                                aria-label="Hakemi kaldır"
                                                                title="Kaldır"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sikletler */}
                                        <div>
                                            <div className="text-xs text-gray-300 mb-1">Sikletler</div>
                                            {weightsForCfg.length === 0 ? (
                                                <div className="text-[11px] text-gray-500">
                                                    Bu yaş kategorisi/cinsiyet için tanımlı siklet yok.
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {weightsForCfg.map((w) => {
                                                        const selected = cfg.selectedWeights.includes(w);
                                                        return (
                                                            <button
                                                                key={w}
                                                                type="button"
                                                                onClick={() => toggleWeight(idx, w)}
                                                                className={[
                                                                    'px-3 py-1.5 rounded-full text-xs border transition',
                                                                    selected
                                                                        ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-50'
                                                                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-premium-gold/30',
                                                                ].join(' ')}
                                                            >
                                                                {w} kg
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                Aynı sikleti birden fazla korta bölmek için kort alanını <b>1,2,3</b> şeklinde girin.
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={addConfig}
                                    className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
                                >
                                    + Gün / Kort / Kategori Satırı Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    {msg && (
                        <div className="rounded-lg border px-3 py-2 text-sm border-amber-400/20 bg-amber-500/10 text-amber-200">
                            {msg}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        Her satır için, seçtiğiniz cinsiyet ve işaretlediğiniz sikletler için alt turnuvalar
                        <b> KATEGORİ-KİLO-CİNSİYET</b> formatında oluşturulur.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253] text-white/90"
                            type="button"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={submitting}
                            className="px-4 py-2 rounded bg-premium-accent hover:bg-indigo-600 text-white font-bold shadow-neon disabled:opacity-60 inline-flex items-center gap-2 transition-all"
                            type="button"
                        >
                            {submitting && (
                                <span className="inline-block h-4 w-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                            )}
                            {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
                        </button>
                    </div>
                </div>

                {/* RESULT MODAL (değişmedi, sadece renumbered şimdi backend'den 0 geliyor) */}
                {result && (
                    <div className="fixed inset-0 z-[95] flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setResult(null)} />
                        <div className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-premium-card border border-premium-border shadow-elite p-6">
                            <div className="text-lg font-semibold mb-3">İçe Aktarma Sonucu</div>
                            <ul className="space-y-1 text-sm text-gray-200">
                                <li>
                                    Alt turnuva: <b>{result.created_subtournaments}</b>
                                </li>
                                <li>
                                    Maç oluşturuldu: <b>{result.created_matches}</b>
                                </li>
                                <li>
                                    Renumbered: <b>{result.renumbered}</b>
                                </li>
                                <li>
                                    Geçersiz lisans satırı: <b>{result.invalid_license_rows}</b>
                                </li>
                                <li>
                                    Zorunlu eksik nedeniyle düşen: <b>{result.dropped_rows_missing_required}</b>
                                </li>
                                <li>
                                    Kullanılan/Oluşturulan kulüp: <b>{result.clubs_created_or_used}</b>
                                </li>
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
                                            const blob = new Blob([bytes], {
                                                type:
                                                    result.cleaning_report.content_type ||
                                                    'application/octet-stream',
                                            });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = fname;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text:white text-sm"
                                    >
                                        Temizlik Raporunu İndir (XLSX)
                                    </button>
                                </div>
                            )}

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        onImported();
                                        onClose();
                                    }}
                                    className="px-4 py-2 rounded bg-[#313844] hover:bg-[#394253]"
                                >
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
    highlightMatchNo,
}: {
    item: SubTournament;
    onChanged: () => void;
    canManage: boolean;
    selected: boolean;
    onToggleSelect: (slug: string) => void;
    highlightMatchNo?: number | null; // ✅
}) {
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const goView = () => nav(`/bracket/${item.public_slug}`);
    const goEdit = () =>
        nav(`/create?mode=sub&edit=${encodeURIComponent(item.public_slug)}&parent=${item.tournament}`);

    const gender = trGenderLabel(item.gender);
    const ageCat = ageCategoryLabelFromMinMax(item.age_min, item.age_max);
    const weightLbl = weightLabelMaxOnly(item);

    const matchHit =
        typeof highlightMatchNo === 'number' &&
        Array.isArray((item as any).match_nos) &&
        (item as any).match_nos.some((n: any) => Number(n) === highlightMatchNo);

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
                className={`group relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 backdrop-blur-xl overflow-hidden
                   focus:outline-none flex items-start justify-between gap-3
                   ${selected
                        ? 'border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2),0_8px_32px_rgba(0,0,0,0.4)] bg-gradient-to-br from-emerald-500/10 via-premium-card/60 to-teal-500/10'
                        : 'border-white/10 hover:border-cyan-400/30 bg-gradient-to-br from-premium-card/50 via-premium-card/40 to-premium-card/50 hover:shadow-[0_0_30px_rgba(0,217,255,0.15),0_8px_32px_rgba(0,0,0,0.4)]'
                    }`}
                style={{
                    background: selected
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(18,18,18,0.7) 50%, rgba(20,184,166,0.08) 100%)'
                        : 'linear-gradient(135deg, rgba(26,11,46,0.4) 0%, rgba(18,18,18,0.6) 40%, rgba(15,23,42,0.5) 100%)'
                }}
            >
                {/* Ambient glow overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${selected ? 'bg-gradient-to-br from-emerald-400/5 via-transparent to-teal-400/5' : 'bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-400/5'
                    }`} />

                {/* Subtle animated gradient on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />

                {/* SOL: seçim + içerik */}
                <div className="pr-3 flex items-start gap-4 flex-1 min-w-0">
                    <div
                        onClick={(e) => {
                            if (!canManage) return;
                            e.stopPropagation();
                            onToggleSelect(item.public_slug);
                        }}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center select-none transition-all duration-300 relative overflow-hidden
                        ${canManage
                                ? selected
                                    ? 'bg-gradient-to-br from-emerald-500/50 via-emerald-400/40 to-teal-500/50 ring-2 ring-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                    : 'bg-gradient-to-br from-cyan-500/20 via-teal-400/15 to-emerald-500/20 hover:from-cyan-500/30 hover:via-teal-400/25 hover:to-emerald-500/30'
                                : 'bg-gradient-to-br from-cyan-500/20 via-teal-400/15 to-emerald-500/20'
                            }`}
                        title={
                            canManage
                                ? (selected ? 'Seçimi kaldır' : 'Alt turnuvayı seç')
                                : undefined
                        }
                    >
                        {/* Ambient glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-emerald-400/10 blur-xl" />

                        <div className="relative z-10">
                            <TurnuvaEmblem variant="sub" size={32} />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{item.title}</div>
                        <div className="text-sm text-white/60 flex flex-wrap items-center gap-2 truncate">
                            <span className="truncate">
                                {gender} · {ageCat} · {weightLbl} kg
                            </span>
                            {matchHit && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-sky-500/15 text-sky-200 border border-sky-400/30">
                                    Maç #{highlightMatchNo}
                                </span>
                            )}
                            {selected && canManage && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                                    Seçili
                                </span>
                            )}
                        </div>
                    </div>
                </div>


                {/* SAĞ: chip + menü */}
                <div className="relative flex items-start gap-2 sm:gap-3 shrink-0 pt-0.5">
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
                                    <circle cx="6" cy="12" r="1.7" fill="currentColor" />
                                    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
                                    <circle cx="18" cy="12" r="1.7" fill="currentColor" />
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
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                                        role="menuitem" type="button"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        Düzenle
                                    </button>
                                    <button onClick={() => {
                                        setOpen(false);
                                        setConfirmOpen(true);
                                    }}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
                                        role="menuitem" type="button"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        Sil
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
                    <div className="absolute inset-0 bg-black/60" />
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
    const { public_slug } = useParams<{ public_slug: string }>();
    const [sp] = useSearchParams();
    const parentIdFromQuery = Number(sp.get('parent') || '');
    const parentId = Number.isFinite(parentIdFromQuery) ? parentIdFromQuery : undefined;

    const { data, isLoading, isError, error, refetch } = useSubTournaments(public_slug);

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

    const qTrim = q.trim();
    const qLower = qTrim.toLowerCase();
    const qMatchNo = /^\d+$/.test(qTrim) ? Number(qTrim) : null;

    const hasMatchNo = (s: SubTournament, no: number) => {
        const arr = Array.isArray((s as any).match_nos) ? (s as any).match_nos : [];
        return arr.some((x: any) => Number(x) === no);
    };

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
        const started = Boolean((s as any).started);
        const finished = Boolean((s as any).finished);
        if (finished) return 'completed';
        if (started) return 'in_progress';
        return cache[s.public_slug] ?? 'pending';
    }

    const list = useMemo(() => {
        const base = (data ?? []).filter((s) => {
            if (!qTrim) return true;

            const titleOk = (s.title || '').toLowerCase().includes(qLower);

            if (qMatchNo == null) return titleOk;

            // q sadece sayı ise: başlık eşleşmesi VEYA match_nos içinde o maç no
            return titleOk || hasMatchNo(s, qMatchNo);
        });
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
            if (qMatchNo != null) {
                const aHas = hasMatchNo(a, qMatchNo);
                const bHas = hasMatchNo(b, qMatchNo);
                if (aHas !== bHas) return aHas ? -1 : 1;
            }

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
                        <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug} />
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
                                    placeholder="Hızlı ara (başlık veya maç no)…"
                                    className="w-full bg-[#0b0f16]/70 border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:border-premium-gold/50 focus:outline-none transition-colors"
                                    aria-label="Alt turnuva ara"
                                />
                                {q && (
                                    <button onClick={() => setQ('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                                        type="button">✕</button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white/90 font-semibold tracking-wide" style={{ textShadow: '0 0 10px rgba(255,255,255,0.15)' }}>SIRALA:</span>
                                <EliteSelect
                                    value={sort}
                                    onChange={(v) => setSort(v as SortKey)}
                                    ariaLabel="Sıralama"
                                    options={[
                                        { value: 'alpha', label: 'Alfabetik (A–Z)' },
                                        { value: 'created', label: 'Oluşturma Tarihi (Yeni → Eski)' },
                                        { value: 'age', label: 'Yaşa göre (Min yaş ↑)' },
                                        { value: 'weight', label: 'Kiloya göre (Ortalama ↑)' },
                                    ]}
                                    className="min-w-[250px]"
                                />
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
                                        className="px-3 py-2 rounded-lg bg-premium-accent hover:bg-indigo-600 text-white text-sm font-bold shadow-neon transition-all"
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
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white text-xs sm:text-sm shadow-md transition-all"
                                    type="button"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    Sil
                                </button>
                                <button
                                    onClick={handleBulkStart}
                                    className="px-3 py-1.5 rounded-lg bg-premium-accent hover:bg-indigo-500 text-white text-xs sm:text-sm shadow-neon transition-all"
                                    type="button"
                                >
                                    🚀 Turnuvayı Başlat
                                </button>
                                <button
                                    onClick={handleBulkClone}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm shadow-md transition-all"
                                    type="button"
                                >
                                    🎯 Alt Turnuvayı Klonla
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-xs sm:text-sm transition-colors"
                                    type="button"
                                >
                                    Seçimi Temizle
                                </button>
                            </div>
                        </div>
                    )}

                    {/* content states */}
                    {isLoading && <SkeletonList />}
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
                            <div className="mt-2 rounded-lg bg-white/[0.02] border border-red-500/30 p-6 space-y-2 backdrop-blur-sm">
                                <p className="text-red-300 font-semibold">Veri alınamadı.</p>
                                <p className="text-sm text-gray-300">{error instanceof Error ? error.message : 'Bilinmeyen hata.'}</p>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => refetch()}
                                        className="px-3 py-2 rounded bg-premium-accent hover:bg-indigo-600 text-sm transition-colors"
                                        type="button">Tekrar Dene
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {!isLoading && !isError && (
                        <>
                            {!list.length ? (
                                <div className="mt-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-premium-accent/20 to-purple-500/20 border border-premium-accent/30 flex items-center justify-center mb-6">
                                        <span className="text-4xl">🏆</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                                        Henüz alt turnuva yok
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Bir alt turnuva oluşturmak ister misiniz?
                                    </p>
                                    {canManage && (parentId ? (
                                        <Link
                                            to={`/create?mode=sub&parent=${parentId}`}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-premium-accent to-indigo-600 hover:from-indigo-600 hover:to-premium-accent text-white font-semibold shadow-neon transition-all duration-300 hover:scale-105"
                                        >
                                            <span>✨</span>
                                            Alt Turnuva Oluştur
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/create?mode=sub"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-premium-accent to-indigo-600 hover:from-indigo-600 hover:to-premium-accent text-white font-semibold shadow-neon transition-all duration-300 hover:scale-105"
                                        >
                                            <span>✨</span>
                                            Alt Turnuva Oluştur
                                        </Link>
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
                inline-flex items-center gap-2 px-4 py-2 rounded-full
                border border-violet-400/30
                bg-gradient-to-r from-violet-600/30 via-violet-500/20 to-violet-400/15
                text-violet-100
                shadow-[0_0_0_1px_rgba(255,255,255,.08),0_8px_24px_-8px_rgba(139,92,246,.45)]
                backdrop-blur-sm
                hover:shadow-[0_0_0_1px_rgba(255,255,255,.12),0_10px_30px_-8px_rgba(139,92,246,.6)]
                transition-all duration-300
                group/day
              ">
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-90 group-hover/day:opacity-100 transition-opacity">
                                                                        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                        <path d="M8 3v4M16 3v4M3.5 10.5h17" stroke="currentColor" strokeWidth="2" />
                                                                    </svg>
                                                                    <span className="text-sm font-bold tracking-wider uppercase">
                                                                        {dayLabel}
                                                                    </span>
                                                                </span>
                                                                <span className="h-[1px] flex-1 rounded-full bg-gradient-to-r from-violet-400/50 via-violet-300/20 to-transparent" />
                                                            </div>

                                                            {/* Gün içi kort grupları */}
                                                            <div className="space-y-8">
                                                                {orderedCourts.map(([courtKey, arr]) => (
                                                                    <div key={String(courtKey)}>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <span className="
                      inline-flex items-center gap-2 px-4 py-2 rounded-full
                      border border-emerald-400/30
                      bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-emerald-400/15
                      text-emerald-100
                      shadow-[0_0_0_1px_rgba(255,255,255,.08),0_8px_24px_-8px_rgba(16,185,129,.45)]
                      backdrop-blur-sm
                      hover:shadow-[0_0_0_1px_rgba(255,255,255,.12),0_10px_30px_-8px_rgba(16,185,129,.6)]
                      transition-all duration-300
                      group/court
                    ">
                                                                                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-90 group-hover/court:opacity-100 transition-opacity">
                                                                                    <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                                    <path d="M12 6v12M3 12h18" stroke="currentColor" strokeWidth="2" />
                                                                                </svg>
                                                                                <span className="text-sm font-bold tracking-wider uppercase">
                                                                                    {courtKey === 'none' ? 'KORT ATANMAMIŞ' : `KORT-${courtKey}`}
                                                                                </span>
                                                                            </span>
                                                                            <span className="h-[1px] flex-1 rounded-full bg-gradient-to-r from-emerald-400/50 via-emerald-300/20 to-transparent" />
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            {arr.map((s) => (
                                                                                <Row
                                                                                    key={s.id}
                                                                                    item={s}
                                                                                    onChanged={refetch}
                                                                                    canManage={canManage}
                                                                                    selected={selectedSlugs.includes(s.public_slug)}
                                                                                    highlightMatchNo={qMatchNo}
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
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[min(86vw,360px)] bg-[#1c2027] border-r border-white/10 p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">Filtreler</div>
                            <button onClick={() => setDrawerOpen(false)} className="text-gray-300 hover:text-white"
                                type="button">✕
                            </button>
                        </div>
                        <SubFilterSidebar filters={filters} setFilters={setFilters} slug={public_slug} />
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
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-[#2a2d34] border border-white/5 relative overflow-hidden">
                    <div
                        className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
                            <EliteSelect
                                value={targetSlug}
                                onChange={(v) => setTargetSlug(v)}
                                ariaLabel="Hedef ana turnuva"
                                options={options.map((t) => ({
                                    value: t.public_slug,
                                    label: (t.title || (t as any).name || t.public_slug) as string,
                                }))}
                                className="w-full"
                            />
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
