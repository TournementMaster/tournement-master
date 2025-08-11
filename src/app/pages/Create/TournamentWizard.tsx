// src/app/pages/Create/TournamentWizard.tsx
import { useMemo, useState, type ReactNode, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'


export type Mode = 'main' | 'sub'
export type Editor = { id: number; username: string }

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

    const mode: Mode = (sp.get('mode') as Mode) || initialMode || 'main';
    const editId = Number(sp.get('edit') || ''); //  ← EDIT ID

    // Ana turnuva alanları
    const [title, setTitle] = useState('')
    const [seasonYear, setSeasonYear] = useState('')
    const [city, setCity] = useState('')
    const [venue, setVenue] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [description, setDescription] = useState('')
    const [isPublic, setIsPublic] = useState(true)

    useEffect(() => {
        if (mode !== 'main') return;
        if (!Number.isFinite(editId) || editId <= 0) return;

        (async () => {
            try {
                const { data } = await api.get(`/tournaments/${editId}/`);
                // alanları doldur
                setTitle(data.title ?? '');
                setSeasonYear(String(data.season_year ?? ''));
                setCity(data.city ?? '');
                setVenue(data.venue ?? '');
                setStartDate(data.start_date ?? '');
                setEndDate(data.end_date ?? '');
                setDescription(data.description ?? '');
                setIsPublic(!!data.public);
                // Editörler opsiyonel – yalnızca id listesi geldiyse doldur
                if (Array.isArray(data.editors)) {
                    setEditors((data.editors as number[]).map((id: number) => ({ id, username: `#${id}` })));
                }
            } catch {
                // data alınamazsa sessiz geç (yeni oluşturma gibi davranır)
            }
        })();
    }, [mode, editId]);

    // Editör ekleme
    const [editorInput, setEditorInput] = useState('')
    const [editors, setEditors] = useState<Editor[]>([])
    const [busyAdd, setBusyAdd] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)

    async function addEditor() {
        const u = editorInput.trim()
        setFeedback(null)
        if (!u) return
        if (editors.some(e => e.username.toLowerCase() === u.toLowerCase())) {
            setFeedback('Bu kullanıcı zaten listede.')
            return
        }
        setBusyAdd(true)
        try {
            const { data } = await api.get<{ id: number }>(
                `users/lookup/${encodeURIComponent(u)}/`
            )
            if (!data || typeof data.id !== 'number') {
                setFeedback('Beklenmeyen cevap.')
            } else if (data.id === -1) {
                setFeedback('Kullanıcı bulunamadı.')
            } else {
                setEditors(prev => [...prev, { id: data.id, username: u }])
                setEditorInput('')
            }
        } catch {
            setFeedback('Sunucu hatası, tekrar deneyin.')
        } finally {
            setBusyAdd(false)
        }
    }

    // Alt turnuva alanları
    const [subTitle, setSubTitle] = useState('')
    const [subDesc, setSubDesc] = useState('')
    const [ageMin, setAgeMin] = useState('')
    const [ageMax, setAgeMax] = useState('')
    const [weightMin, setWeightMin] = useState('')
    const [weightMax, setWeightMax] = useState('')
    const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
    const [subPublic, setSubPublic] = useState(true)

    // Alt turnuva için parentId belirle
    const subParentId = (() => {
        const p = Number(sp.get('parent') || '')
        if (!isNaN(p) && p > 0) return p
        if (defaultParentId) return defaultParentId
        return undefined
    })()

    // Adımlar
    const steps = useMemo(
        () =>
            mode === 'main'
                ? (['Genel Bilgiler', 'Organizasyon', 'Özet'] as const)
                : (['Genel Bilgiler', 'Özet'] as const),
        [mode]
    )
    const [step, setStep] = useState(0)

    // “İleri” butonu aktif mi?
    const canNext = useMemo(() => {
        if (mode === 'main' && steps[step] === 'Genel Bilgiler') {
            const vTitle = title.trim().length >= 3
            const vYear = /^\d{4}$/.test(seasonYear)
            const vDates = !!startDate && !!endDate && startDate <= endDate
            return vTitle && vYear && vDates
        }
        if (mode === 'sub' && steps[step] === 'Genel Bilgiler') {
            const vTitle = subTitle.trim().length >= 3
            const m = Number(ageMin) || undefined
            const M = Number(ageMax) || undefined
            const ageOK = m == null || M == null || m <= M
            return vTitle && ageOK && !!subParentId
        }
        return true
    }, [
        mode,
        step,
        steps,
        title,
        seasonYear,
        startDate,
        endDate,
        subTitle,
        ageMin,
        ageMax,
        subParentId,
    ])

    async function save() {
        if (mode === 'main') {
            const payload = { /* ... */ };

            try {
                await api.post('/tournaments/', payload);           // ← data alma, direkt bekle
                await qc.invalidateQueries({ queryKey: ['tournaments'] });
                navigate('/', { replace: true });                   // Dashboard
            } catch {
                alert('İşlem başarısız.');
            }
            return;
        }


        // Alt turnuva
        if (!subParentId) {
            alert('Ana turnuva ID bulunamadı.')
            return
        }
        try {
            await api.post('/subtournaments/', {
                tournament: subParentId,
                title: subTitle,
                description: subDesc,
                age_min: Number(ageMin) || 0,
                age_max: Number(ageMax) || 0,
                weight_min: weightMin,
                weight_max: weightMax,
                gender,
                public: subPublic,
            })
            await qc.invalidateQueries({ queryKey: ['subtournaments'] })
            navigate(-1)
        } catch {
            alert('Alt turnuva oluşturulamadı.')
        }
    }

    return (
        <div className="mx-auto max-w-5xl">
            {/* Başlık Çubuğu */}
            <GradientFrame>
                <div className="flex items-center justify-between px-6 py-5">
                    <div>
                        <div className="text-xs uppercase text-gray-400">Turnuva Sihirbazı</div>
                        <h1 className="text-2xl font-bold">
                            {mode === 'main'
                                ? (editId ? 'Ana Turnuva Düzenle' : 'Ana Turnuva Oluştur')
                                : 'Alt Turnuva Oluştur'}
                        </h1>
                    </div>
                    <div className="text-sm text-gray-400">
                        {step + 1}/{steps.length}
                    </div>
                </div>
                <div className="px-3 pb-3">
                    <div className="flex gap-2 flex-wrap">
                        {steps.map((s, i) => (
                            <button
                                key={s}
                                onClick={() => setStep(i)}
                                className={`px-3 py-1.5 rounded-full text-xs ${
                                    i === step
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-[#3a3f49] hover:bg-[#444956] text-gray-200'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </GradientFrame>

            {/* İçerik Kartı */}
            <GradientFrame className="mt-6">
                <div className="p-6 space-y-6">
                    {/* MAIN: Genel Bilgiler */}
                    {mode === 'main' && steps[step] === 'Genel Bilgiler' && (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled
                                    label="Başlık"
                                    value={title}
                                    set={setTitle}
                                    placeholder="2025 İstanbul Şampiyonası"
                                />
                                <Labeled
                                    label="Sezon Yılı"
                                    type="number"
                                    value={seasonYear}
                                    set={setSeasonYear}
                                    placeholder="2025"
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled label="Şehir" value={city} set={setCity} />
                                <Labeled label="Mekan" value={venue} set={setVenue} />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled
                                    label="Başlangıç Tarihi"
                                    type="date"
                                    value={startDate}
                                    set={setStartDate}
                                />
                                <Labeled
                                    label="Bitiş Tarihi"
                                    type="date"
                                    value={endDate}
                                    set={setEndDate}
                                />
                            </div>
                            <TextArea label="Açıklama" value={description} set={setDescription} />
                            <Toggle checked={isPublic} onChange={setIsPublic}>Public</Toggle>
                        </>
                    )}

                    {/* MAIN: Organizasyon */}
                    {mode === 'main' && steps[step] === 'Organizasyon' && (
                        <>
                            <div>
                                <label className="block text-sm mb-1">Editör Ekle (kullanıcı adı)</label>
                                <div className="flex gap-2">
                                    <input
                                        value={editorInput}
                                        onChange={e => setEditorInput(e.target.value)}
                                        className="flex-1 bg-[#1f2229] rounded px-3 py-2"
                                    />
                                    <button
                                        disabled={busyAdd || !editorInput.trim()}
                                        onClick={addEditor}
                                        className="px-3 py-2 rounded bg-sky-600 disabled:opacity-50"
                                    >
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
                                                <span>{e.username}</span>
                                                <button
                                                    onClick={() => setEditors(list => list.filter((_, idx) => idx !== i))}
                                                    className="rounded bg-gray-700 px-2 py-0.5 text-xs"
                                                >
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
                            <LabeledSelect
                                label="Cinsiyet"
                                value={gender}
                                set={setGender}
                                options={{ M: 'Erkek', F: 'Kadın', O: 'Karma' }}
                            />
                            <TextArea label="Açıklama" value={subDesc} set={setSubDesc} />
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled
                                    label="Yaş Min"
                                    type="number"
                                    value={ageMin}
                                    set={setAgeMin}
                                />
                                <Labeled
                                    label="Yaş Max"
                                    type="number"
                                    value={ageMax}
                                    set={setAgeMax}
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled label="Kilo Min (kg)" value={weightMin} set={setWeightMin} />
                                <Labeled label="Kilo Max (kg)" value={weightMax} set={setWeightMax} />
                            </div>
                            <Toggle checked={subPublic} onChange={setSubPublic}>Public</Toggle>
                        </>
                    )}

                    {/* ÖZET */}
                    {steps[step] === 'Özet' && (
                        <SummaryCard
                            mode={mode}
                            propsMain={{
                                title,
                                seasonYear,
                                city,
                                venue,
                                startDate,
                                endDate,
                                isPublic,
                                editors,
                            }}
                            propsSub={{
                                subTitle,
                                gender,
                                ageMin,
                                ageMax,
                                weightMin,
                                weightMax,
                                subPublic,
                            }}
                        />
                    )}

                    {/* Navigasyon */}
                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setStep(s => Math.max(0, s - 1))}
                            disabled={step === 0}
                            className="rounded bg-[#3a3f49] px-3 py-2 disabled:opacity-40"
                        >
                            Geri
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canNext}
                                className="rounded bg-sky-600 px-3 py-2 disabled:opacity-40"
                            >
                                İleri
                            </button>
                        ) : (
                            <button
                                onClick={save}
                                className="rounded bg-emerald-600 px-3 py-2"
                            >
                                Kaydet
                            </button>
                        )}
                    </div>
                </div>
            </GradientFrame>
        </div>
    )
}

/** Yardımcı bileşenler **/

function GradientFrame({
                           children,
                           className = '',
                       }: {
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`wizard-frame ${className}`}>
            <div className="inner">{children}</div>
        </div>
    )
}

function Labeled({
                     label,
                     value,
                     set,
                     type = 'text',
                     placeholder = '',
                 }: {
    label: string
    value: string
    set: (v: string) => void
    type?: 'text' | 'number' | 'date'
    placeholder?: string
}) {
    return (
        <div className="flex flex-col">
            <label className="mb-1">{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={e => set(e.target.value)}
                className="rounded bg-[#1f2229] px-3 py-2"
            />
        </div>
    )
}

function LabeledSelect<T extends string>({
                                             label,
                                             value,
                                             set,
                                             options,
                                         }: {
    label: string
    value: T
    set: (v: T) => void
    options: Record<T, string>
}) {
    return (
        <div className="flex flex-col">
            <label className="mb-1">{label}</label>
            <select
                value={value}
                onChange={e => set(e.target.value as T)}
                className="rounded bg-[#1f2229] px-3 py-2"
            >
                {(Object.keys(options) as T[]).map(k => (
                    <option key={k} value={k}>
                        {options[k]}
                    </option>
                ))}
            </select>
        </div>
    )
}

function TextArea({
                      label,
                      value,
                      set,
                  }: {
    label: string
    value: string
    set: (v: string) => void
}) {
    return (
        <div>
            <label className="mb-1 block">{label}</label>
            <textarea
                value={value}
                onChange={e => set(e.target.value)}
                className="h-28 w-full rounded bg-[#1f2229] px-3 py-2"
            />
        </div>
    )
}

function Toggle({
                    checked,
                    onChange,
                    children,
                }: {
    checked: boolean
    onChange: (v: boolean) => void
    children: ReactNode
}) {
    return (
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <span>{children}</span>
            <span
                onClick={() => onChange(!checked)}
                className={`inline-block h-8 w-14 rounded-full p-1 transition ${
                    checked ? 'bg-emerald-500' : 'bg-gray-600'
                }`}
            >
        <span
            className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-0'
            }`}
        />
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
        title: string
        seasonYear: string
        city: string
        venue: string
        startDate: string
        endDate: string
        isPublic: boolean
        editors: Editor[]
    }
    propsSub: {
        subTitle: string
        gender: string
        ageMin: string
        ageMax: string
        weightMin: string
        weightMax: string
        subPublic: boolean
    }
}) {
    return (
        <div className="rounded bg-[#23252b] p-4 text-sm">
            {mode === 'main' ? (
                <>
                    <div><b>Başlık:</b> {propsMain.title || '-'}</div>
                    <div><b>Sezon:</b> {propsMain.seasonYear || '-'}</div>
                    <div><b>Şehir:</b> {propsMain.city || '-'}</div>
                    <div><b>Mekan:</b> {propsMain.venue || '-'}</div>
                    <div>
                        <b>Tarih:</b> {propsMain.startDate || '-'} – {propsMain.endDate || '-'}
                    </div>
                    <div><b>Public:</b> {propsMain.isPublic ? 'Evet' : 'Hayır'}</div>
                    <div>
                        <b>Editörler:</b>{' '}
                        {propsMain.editors.length
                            ? propsMain.editors.map(e => e.username).join(', ')
                            : '-'}
                    </div>
                </>
            ) : (
                <>
                    <div><b>Başlık:</b> {propsSub.subTitle || '-'}</div>
                    <div>
                        <b>Cinsiyet:</b>{' '}
                        {propsSub.gender === 'M'
                            ? 'Erkek'
                            : propsSub.gender === 'F'
                                ? 'Kadın'
                                : 'Karma'}
                    </div>
                    <div><b>Yaş:</b> {propsSub.ageMin || '-'} – {propsSub.ageMax || '-'}</div>
                    <div><b>Kilo:</b> {propsSub.weightMin || '-'} – {propsSub.weightMax || '-'}</div>
                    <div><b>Public:</b> {propsSub.subPublic ? 'Evet' : 'Hayır'}</div>
                </>
            )}
        </div>
    )
}
