// src/app/pages/Create/TournamentWizard.tsx
import { useMemo, useState, type ReactNode, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type Mode = 'main' | 'sub'
export type Editor = { id: number; username: string }
export type Referee = { id: number; username: string };

export default function TournamentWizard({
                                             mode: initialMode,
                                             defaultParentId,
                                         }: {
    mode: Mode
    defaultParentId?: number
}) {
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [sp] = useSearchParams()

    // 👇 Basit cache ile tekrar tekrar aynı id'yi çağırmayalım
    const userCache = new Map<number, string>();
    async function usernameById(id: number): Promise<string | null> {
        if (userCache.has(id)) return userCache.get(id)!;
        try {
            const { data } = await api.get<{ id:number; username:string }>(`auth/users/${id}/`);
            const uname = (data as any)?.username ?? null;
            if (uname) userCache.set(id, uname);
            return uname;
        } catch { return null; }
    }

    const mode: Mode = (sp.get('mode') as Mode) || initialMode || 'main'
    const editSlug = (sp.get('edit') || '').trim()

    // ───── ANA TURNUVA ALANLARI ─────
    const [title, setTitle] = useState('')
    const [seasonYear, setSeasonYear] = useState('')
    const [city, setCity] = useState('')
    const [venue, setVenue] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [description, setDescription] = useState('')
    const [isPublic, setIsPublic] = useState(true)

    // Tartı günü
    const [weighEnabled, setWeighEnabled] = useState(false)
    const [weighDate, setWeighDate] = useState('')
    const [weighStart, setWeighStart] = useState('')
    const [weighEnd, setWeighEnd] = useState('')
    const [weighInSlug, setWeighInSlug] = useState<string | null>(null);
    const [weighOpen, setWeighOpen] = useState(true);
    const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);

    // SUB: Hakem
    const [refInput, setRefInput] = useState('');
    const [referees, setReferees] = useState<Referee[]>([]);
    const [busyRef, setBusyRef] = useState(false);
    const [refFeedback, setRefFeedback] = useState<string | null>(null);
    async function addReferee() {
        const u = refInput.trim(); setRefFeedback(null); if (!u) return;
        setBusyRef(true);
        try {
            const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`);
            const uid = typeof data?.id === 'number' ? data.id : -1;
            if (uid <= 0) setRefFeedback('Kullanıcı bulunamadı.');
            else if (referees.some(r => r.id === uid || r.username.toLowerCase() === u.toLowerCase())) setRefFeedback('Bu kullanıcı zaten hakem listesinde.');
            else { setReferees(prev => [...prev, { id: uid, username: u }]); setRefInput(''); }
        } catch { setRefFeedback('Sunucu hatası, tekrar deneyin.'); }
        finally { setBusyRef(false); }
    }

    // MAIN: Düzenleme modunda alanları doldur
    useEffect(() => {
        if (mode !== 'main' || !editSlug) return;
        (async () => {
            try {
                const { data } = await api.get(`tournaments/${encodeURIComponent(editSlug)}/`);
                setTitle(data.title ?? '');
                setSeasonYear(String(data.season_year ?? ''));
                setCity(data.city ?? '');
                setVenue(data.venue ?? '');
                setStartDate(data.start_date ?? '');
                setEndDate(data.end_date ?? '');
                setDescription(data.description ?? '');
                setIsPublic(!!data.public);
                setEditingTournamentId(typeof data.id === 'number' ? data.id : null);

                if (Array.isArray(data.editors)) {
                    const ids = Array.from(new Set<number>(data.editors as number[]));
                    const resolved = await Promise.all(ids.map(async (id) => {
                        const uname = await usernameById(id);
                        return { id, username: uname ?? String(id) };
                    }));
                    setEditors(resolved);
                }
            } catch {}

            // Weigh-in oku (varsa)
            try {
                const wi = await api.get(`tournaments/${encodeURIComponent(editSlug)}/weigh-in/`);
                const w = wi?.data;
                if (w && typeof w.public_slug === 'string') {
                    setWeighInSlug(w.public_slug);
                    setWeighEnabled(true);
                    setWeighDate(w.date || '');
                    setWeighStart((w.start_time || '').slice(0, 5));
                    setWeighEnd((w.end_time || '').slice(0, 5));
                    setWeighOpen(!!w.is_open);
                } else {
                    setWeighInSlug(null); setWeighEnabled(false);
                }
            } catch { setWeighInSlug(null); setWeighEnabled(false); }
        })();
    }, [mode, editSlug]);

    // Editörler
    const [editorInput, setEditorInput] = useState('')
    const [editors, setEditors] = useState<Editor[]>([])
    const [busyAdd, setBusyAdd] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)
    async function addEditor() {
        const u = editorInput.trim(); setFeedback(null); if (!u) return;
        setBusyAdd(true);
        try {
            const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`);
            const uid = typeof data?.id === 'number' ? data.id : -1;
            if (uid <= 0) setFeedback('Kullanıcı bulunamadı.');
            else if (editors.some(e => e.id === uid || e.username.toLowerCase() === u.toLowerCase())) setFeedback('Bu kullanıcı zaten listede.');
            else { setEditors(prev => [...prev, { id: uid, username: u }]); setEditorInput(''); }
        } catch { setFeedback('Sunucu hatası, tekrar deneyin.'); }
        finally { setBusyAdd(false); }
    }

    // ───── ALT TURNUVA ALANLARI ─────
    const [subTitle, setSubTitle] = useState('')
    const [subDesc, setSubDesc] = useState('')
    const [ageMin, setAgeMin] = useState('')
    const [ageMax, setAgeMax] = useState('')
    const [weightMin, setWeightMin] = useState('')
    const [weightMax, setWeightMax] = useState('')
    const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
    const [subPublic, setSubPublic] = useState(true)
    const [defaultCourt, setDefaultCourt] = useState('')

    // SUB: Düzenleme modunda alanları doldur
    useEffect(() => {
        if (mode !== 'sub' || !editSlug) return;
        (async () => {
            try {
                const { data } = await api.get(`subtournaments/${encodeURIComponent(editSlug)}/`);
                setSubTitle(data.title ?? '');
                setSubDesc(data.description ?? '');
                setAgeMin(Number.isFinite(data.age_min as never) ? String(data.age_min) : '');
                setAgeMax(Number.isFinite(data.age_max as never) ? String(data.age_max) : '');
                setWeightMin((data.weight_min ?? '').toString());
                setWeightMax((data.weight_max ?? '').toString());
                setGender((data.gender as never) || 'M');
                setSubPublic(!!data.public);
                setDefaultCourt(String(data.court_no ?? ''));
                if (Array.isArray((data as any).referees)) {
                    const ids = Array.from(new Set<number>(data.referees as number[]));
                    const resolvedRefs = await Promise.all(ids.map(async (id) => {
                        const uname = await usernameById(id);
                        return { id, username: uname ?? String(id) };
                    }));
                    setReferees(resolvedRefs);
                }
            } catch {}
        })();
    }, [mode, editSlug])

    // Alt turnuva için parentId
    const subParentId = (() => {
        const p = Number(sp.get('parent') || '')
        if (!isNaN(p) && p > 0) return p
        if (defaultParentId) return defaultParentId
        return undefined
    })()

    // Adımlar
    const steps = useMemo(
        () => mode === 'main'
            ? (['Genel Bilgiler', 'Tartı Günü', 'Organizasyon', 'Özet'] as const)
            : (['Genel Bilgiler', 'Özet'] as const),
        [mode],
    )
    const [step, setStep] = useState(0)

    // step değişince yukarı kaydır
    useEffect(() => {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    }, [step]);

    // “İleri” aktif mi?
    const canNext = useMemo(() => {
        if (mode === 'main' && steps[step] === 'Genel Bilgiler') {
            const vTitle = title.trim().length >= 3
            const vYear = /^\d{4}$/.test(seasonYear)
            const vDates = !!startDate && !!endDate && startDate <= endDate
            return vTitle && vYear && vDates
        }
        if (mode === 'main' && steps[step] === 'Tartı Günü') {
            if (!weighEnabled) return true
            const datesOk = !!weighDate && !!weighStart && !!weighEnd
            return datesOk
        }
        if (mode === 'sub' && steps[step] === 'Genel Bilgiler') {
            const vTitle = subTitle.trim().length >= 3
            const m = Number(ageMin) || undefined
            const M = Number(ageMax) || undefined
            const ageOK = m == null || M == null || m <= M
            return vTitle && ageOK && (!!subParentId || !!editSlug)
        }
        return true
    }, [mode, step, steps, title, seasonYear, startDate, endDate, subTitle, ageMin, ageMax, subParentId, editSlug, weighEnabled, weighDate, weighStart, weighEnd])

    async function save() {
        if (mode === 'main') {
            async function resolveOwnerId(): Promise<number> {
                const u = (localStorage.getItem('username') || '').trim()
                if (!u) return 0
                try {
                    const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`)
                    return typeof data?.id === 'number' ? data.id : 0
                } catch { return 0 }
            }
            const basePayload = {
                title: title.trim(),
                season_year: Number(seasonYear) || 0,
                city: city.trim(),
                venue: venue.trim(),
                start_date: startDate || null,
                end_date: endDate || null,
                description: description.trim(),
                public: isPublic,
                editors: editors.map(e => e.id),
            };
            try {
                if (editSlug) {
                    const { data: patched } = await api.patch(
                        `tournaments/${encodeURIComponent(editSlug)}/`, basePayload
                    );
                    const tid = editingTournamentId ?? patched?.id ?? null;

                    if (weighEnabled) {
                        const wiPayload = {
                            tournament: tid ?? 0,
                            date: weighDate,
                            start_time: weighStart,
                            end_time:   weighEnd,
                            is_open:    weighOpen,
                        };
                        if (weighInSlug) {
                            await api.patch(`weighins/${encodeURIComponent(weighInSlug)}/`, wiPayload);
                        } else {
                            const { data: createdWI } = await api.post('weighins/', wiPayload);
                            if (createdWI?.public_slug) setWeighInSlug(createdWI.public_slug);
                        }
                    } else if (weighInSlug) {
                        await api.patch(`weighins/${encodeURIComponent(weighInSlug)}/`, { is_open: false });
                    }
                } else {
                    const owner = await resolveOwnerId();
                    const { data: created } = await api.post('tournaments/', { ...basePayload, owner });
                    if (weighEnabled) {
                        const { data: createdWI } = await api.post('weighins/', {
                            tournament: created?.id ?? 0,
                            date: weighDate,
                            start_time: weighStart,
                            end_time: weighEnd,
                            is_open: weighOpen,
                        });
                        if (createdWI?.public_slug) setWeighInSlug(createdWI.public_slug);
                    }
                }
                await qc.invalidateQueries({ queryKey: ['tournaments'] });
                navigate('/', { replace: true });
            } catch { alert('İşlem başarısız.'); }
            return;
        }

        // ALT TURNUVA
        if (editSlug) {
            try {
                await api.patch(`subtournaments/${encodeURIComponent(editSlug)}/`, {
                    title: subTitle,
                    description: subDesc,
                    age_min: Number(ageMin) || 0,
                    age_max: Number(ageMax) || 0,
                    weight_min: weightMin,
                    weight_max: weightMax,
                    gender,
                    public: subPublic,
                    ...(defaultCourt ? { court_no: Number(defaultCourt) } : {}),
                    referees: referees.map(r => r.id),
                })
                await qc.invalidateQueries({ queryKey: ['subtournaments'] })
                navigate(-1)
            } catch { alert('Alt turnuva güncellenemedi.'); }
            return
        }

        // OLUŞTURMA
        if (!subParentId) { alert('Ana turnuva ID bulunamadı.'); return }
        try {
            await api.post('subtournaments/', {
                tournament: subParentId,
                title: subTitle,
                description: subDesc,
                age_min: Number(ageMin) || 0,
                age_max: Number(ageMax) || 0,
                weight_min: weightMin,
                weight_max: weightMax,
                gender,
                public: subPublic,
                ...(defaultCourt ? { court_no: Number(defaultCourt) } : {}),
                referees: referees.map(r => r.id),
            })
            await qc.invalidateQueries({ queryKey: ['subtournaments'] })
            navigate(-1)
        } catch { alert('Alt turnuva oluşturulamadı.'); }
    }

    const onBack = () => {
        if (step === 0) navigate('/', { replace: true })
        else setStep(s => Math.max(0, s - 1))
    }

    const progress = Math.round(((step + 1) / steps.length) * 100)

    return (
        <div className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-0">
            {/* Başlık + adım çubukları */}
            <GradientFrame>
                <div className="px-4 sm:px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Turnuva Sihirbazı</div>
                        <h1 className="text-xl sm:text-2xl font-bold truncate">
                            {mode === 'main'
                                ? (editSlug ? 'Ana Turnuva Düzenle' : 'Ana Turnuva Oluştur')
                                : (editSlug ? 'Alt Turnuva Düzenle' : 'Alt Turnuva Oluştur')}
                        </h1>
                    </div>
                    <div className="text-sm text-gray-400 shrink-0">{step + 1}/{steps.length}</div>
                </div>

                {/* yatay kaydırmalı adım pill’leri */}
                <div className="px-2 sm:px-3 pb-2">
                    <div className="flex gap-2 overflow-x-auto px-2 -mx-2 pb-1">
                        {steps.map((s, i) => (
                            <button
                                key={`${s}-${i}`}
                                onClick={() => setStep(i)}
                                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition
                  ${i === step ? 'bg-sky-600 text-white' : 'bg-[#3a3f49] hover:bg-[#444956] text-gray-200'}`}
                                type="button"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-white/10 rounded">
                        <div className="h-1.5 bg-emerald-500 rounded" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </GradientFrame>

            {/* İçerik */}
            <GradientFrame className="mt-6">
                <div className="p-4 sm:p-6 space-y-6">
                    {/* MAIN: Genel Bilgiler */}
                    {mode === 'main' && steps[step] === 'Genel Bilgiler' && (
                        <>
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Başlık" value={title} set={setTitle} placeholder="2025 İstanbul Şampiyonası" />
                                <Labeled label="Sezon Yılı" type="number" value={seasonYear} set={setSeasonYear} placeholder="2025" />
                            </div>
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Şehir" value={city} set={setCity} />
                                <Labeled label="Mekan" value={venue} set={setVenue} />
                            </div>
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Başlangıç Tarihi" type="date" value={startDate} set={setStartDate} />
                                <Labeled label="Bitiş Tarihi" type="date" value={endDate} set={setEndDate} />
                            </div>
                            <TextArea label="Açıklama" value={description} set={setDescription} />
                            <Toggle checked={isPublic} onChange={setIsPublic}>Herkes</Toggle>
                        </>
                    )}

                    {/* MAIN: Tartı Günü */}
                    {mode === 'main' && steps[step] === 'Tartı Günü' && (
                        <>
                            <Toggle checked={weighEnabled} onChange={setWeighEnabled}>Tartı Günü Aktif</Toggle>
                            {weighEnabled && (
                                <>
                                    <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                                        <Labeled label="Tarih" type="date" value={weighDate} set={setWeighDate} />
                                        <Labeled label="Başlangıç Saati" type="time" value={weighStart} set={setWeighStart} />
                                        <Labeled label="Bitiş Saati" type="time" value={weighEnd} set={setWeighEnd} />
                                    </div>
                                    <div className="pt-2">
                                        <Toggle checked={weighOpen} onChange={setWeighOpen}>Randevu Alımı Açık</Toggle>
                                    </div>
                                </>
                            )}
                            <p className="text-xs text-gray-400">
                                Kaydederken bu bilgiler varsa turnuvayla birlikte tartı günü de oluşturulur/güncellenir.
                            </p>
                        </>
                    )}

                    {/* MAIN: Organizasyon */}
                    {mode === 'main' && steps[step] === 'Organizasyon' && (
                        <>
                            <div>
                                <label className="block text-sm mb-1">Editör Ekle (kullanıcı adı)</label>
                                <div className="flex gap-2">
                                    <input value={editorInput} onChange={e => setEditorInput(e.target.value)} className="flex-1 bg-[#1f2229] rounded px-3 py-2" />
                                    <button disabled={busyAdd || !editorInput.trim()} onClick={addEditor} className="px-3 py-2 rounded bg-sky-600 disabled:opacity-50">
                                        Ekle
                                    </button>
                                </div>
                                {feedback && <p className="mt-2 text-sm text-red-400">{feedback}</p>}
                            </div>
                            <div className="bg-[#23252b] rounded p-3">
                                <div className="mb-2 text-sm font-medium text-gray-200">Seçilen Editörler</div>
                                {editors.length === 0 ? (
                                    <p className="text-xs text-gray-400">Henüz editör eklenmedi.</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {editors.map((e, i) => (
                                            <li key={i} className="flex items-center justify-between text-sm">
                                                <span className="truncate">{e.username}</span>
                                                <button onClick={() => setEditors(list => list.filter((_, idx) => idx !== i))} className="rounded bg-gray-700 px-2 py-0.5 text-xs">
                                                    Kaldır
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}

                    {/* ALT: Genel Bilgiler */}
                    {mode === 'sub' && steps[step] === 'Genel Bilgiler' && (
                        <>
                            <Labeled label="Alt Turnuva Başlığı" value={subTitle} set={setSubTitle} />
                            <LabeledSelect label="Cinsiyet" value={gender} set={setGender} options={{ M: 'Erkek', F: 'Kadın', O: 'Karma' }} />
                            <TextArea label="Açıklama" value={subDesc} set={setSubDesc} />
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Yaş Min" type="number" value={ageMin} set={setAgeMin} />
                                <Labeled label="Yaş Max" type="number" value={ageMax} set={setAgeMax} />
                            </div>
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Kilo Min (kg)" value={weightMin} set={(v) => setWeightMin(v.replace(/\D/g, '').slice(0, 3))} type="number" />
                                <Labeled label="Kilo Max (kg)" value={weightMax} set={(v) => setWeightMax(v.replace(/\D/g, '').slice(0, 3))} type="number" />
                            </div>
                            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                                <Labeled label="Varsayılan Kort No (ops.)" value={defaultCourt} set={(v) => setDefaultCourt(v.replace(/\D/g, '').slice(0, 3))} type="number" placeholder="1" />
                                <div />
                            </div>
                            <Toggle checked={subPublic} onChange={setSubPublic}>Herkes</Toggle>

                            <div className="mt-2">
                                <label className="block text-sm mb-1">Hakem Ekle (kullanıcı adı)</label>
                                <div className="flex gap-2">
                                    <input value={refInput} onChange={e => setRefInput(e.target.value)} className="flex-1 bg-[#1f2229] rounded px-3 py-2" />
                                    <button disabled={busyRef || !refInput.trim()} onClick={addReferee} className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50" type="button">
                                        Ekle
                                    </button>
                                </div>
                                {refFeedback && <p className="mt-2 text-sm text-red-400">{refFeedback}</p>}

                                <div className="bg-[#23252b] rounded p-3 mt-3">
                                    <div className="mb-2 text-sm font-medium text-gray-200">Hakemler</div>
                                    {referees.length === 0 ? (
                                        <p className="text-xs text-gray-400">Henüz hakem eklenmedi.</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {referees.map((r, i) => (
                                                <li key={i} className="flex items-center justify-between text-sm">
                                                    <span className="truncate">{r.username}</span>
                                                    <button onClick={() => setReferees(list => list.filter((_, idx) => idx !== i))} className="rounded bg-gray-700 px-2 py-0.5 text-xs" type="button">
                                                        Kaldır
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ÖZET */}
                    {steps[step] === 'Özet' && (
                        <SummaryCard
                            mode={mode}
                            propsMain={{ title, seasonYear, city, venue, startDate, endDate, isPublic, editors }}
                            propsSub={{ subTitle, gender, ageMin, ageMax, weightMin, weightMax, subPublic }}
                        />
                    )}

                    {/* Desktop Navigasyon */}
                    <div className="hidden sm:flex justify-between pt-4">
                        <button onClick={onBack} className="rounded bg-[#3a3f49] px-4 py-2" type="button">Geri</button>
                        {step < steps.length - 1 ? (
                            <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="rounded bg-sky-600 px-4 py-2 disabled:opacity-40" type="button">
                                İleri
                            </button>
                        ) : (
                            <button onClick={save} className="rounded bg-emerald-600 px-4 py-2" type="button">Kaydet</button>
                        )}
                    </div>
                </div>
            </GradientFrame>

            {/* Mobil sabit alt bar (ekran altına pinlenir) */}
            <div className="sm:hidden h-[68px]" />
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0f1218]/95 backdrop-blur">
                <div className="max-w-5xl mx-auto px-3 py-3 flex gap-2">
                    <button onClick={onBack} className="w-1/3 rounded bg-[#3a3f49] px-4 py-3 text-sm" type="button">Geri</button>
                    {step < steps.length - 1 ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="w-2/3 rounded bg-sky-600 px-4 py-3 text-sm disabled:opacity-40" type="button">
                            İleri
                        </button>
                    ) : (
                        <button onClick={save} className="w-2/3 rounded bg-emerald-600 px-4 py-3 text-sm" type="button">
                            Kaydet
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

/** Yardımcı bileşenler **/
function GradientFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-[#1b1f24]/60 shadow-lg ${className}`}>
            {children}
        </div>
    )
}
function Labeled({ label, value, set, type = 'text', placeholder = '' }: {
    label: string
    value: string
    set: (v: string) => void
    type?: 'text' | 'number' | 'date' | 'time'
    placeholder?: string
}) {
    return (
        <div className="flex flex-col min-w-0">
            <label className="mb-1 text-sm">{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={e => set(e.target.value)}
                className="rounded bg-[#1f2229] px-3 py-2 w-full"
            />
        </div>
    )
}
function LabeledSelect<T extends string>({ label, value, set, options }: {
    label: string
    value: T
    set: (v: T) => void
    options: Record<T, string>
}) {
    return (
        <div className="flex flex-col">
            <label className="mb-1 text-sm">{label}</label>
            <select value={value} onChange={e => set(e.target.value as T)} className="rounded bg-[#1f2229] px-3 py-2">
                {(Object.keys(options) as T[]).map(k => (
                    <option key={k} value={k}>{options[k]}</option>
                ))}
            </select>
        </div>
    )
}
function TextArea({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
    return (
        <div>
            <label className="mb-1 block text-sm">{label}</label>
            <textarea value={value} onChange={e => set(e.target.value)} className="h-28 w-full rounded bg-[#1f2229] px-3 py-2" />
        </div>
    )
}
function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
    return (
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <span className="text-sm">{children}</span>
            <span onClick={() => onChange(!checked)} className={`inline-block h-8 w-14 rounded-full p-1 transition ${checked ? 'bg-emerald-500' : 'bg-gray-600'}`}>
        <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </span>
        </label>
    )
}
function SummaryCard({
                         mode,
                         propsMain,
                         propsSub,
                     }: {
    mode: Mode
    propsMain: {
        title: string; seasonYear: string; city: string; venue: string;
        startDate: string; endDate: string; isPublic: boolean; editors: Editor[]
    }
    propsSub: {
        subTitle: string; gender: 'M'|'F'|'O'; ageMin: string; ageMax: string;
        weightMin: string; weightMax: string; subPublic: boolean
    }
}) {
    const { title, seasonYear, city, venue, startDate, endDate, isPublic, editors } = propsMain
    const { subTitle, gender, ageMin, ageMax, weightMin, weightMax, subPublic } = propsSub
    return (
        <div className="space-y-4 text-sm">
            {mode === 'main' ? (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <div><b>Başlık:</b> {title}</div>
                    <div><b>Sezon:</b> {seasonYear}</div>
                    <div><b>Şehir:</b> {city}</div>
                    <div><b>Mekan:</b> {venue}</div>
                    <div><b>Başlangıç:</b> {startDate}</div>
                    <div><b>Bitiş:</b> {endDate}</div>
                    <div><b>Herkes:</b> {isPublic ? 'Evet' : 'Hayır'}</div>
                    <div><b>Editörler:</b> {editors.length ? editors.map(e=>e.username).join(', ') : '—'}</div>
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <div><b>Başlık:</b> {subTitle}</div>
                    <div><b>Cinsiyet:</b> {gender === 'M' ? 'Erkek' : gender === 'F' ? 'Kadın' : 'Karma'}</div>
                    <div><b>Yaş:</b> {(ageMin || '?') + '–' + (ageMax || '?')}</div>
                    <div><b>Kilo:</b> {(weightMin || '?') + '–' + (weightMax || '?')} kg</div>
                    <div><b>Herkes:</b> {subPublic ? 'Evet' : 'Hayır'}</div>
                </div>
            )}
        </div>
    )
}
