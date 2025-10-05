import { useMemo, useState, type ReactNode, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type Mode = 'main' | 'sub'
export type Editor = { id: number; username: string }
export type Referee = { id: number; username: string };

// ── YAŞ KATEGORİLERİ ────────────────────────────────────────────────────────
type AgeCatKey = 'kucukler' | 'minikler' | 'yildizlar' | 'gencler' | 'umitler' | 'buyukler';
const AGE_CATEGORIES: Record<AgeCatKey, { label: string; min: number; max: number | null }> = {
    kucukler: { label: 'Küçükler',  min: 0,  max: 10 },
    minikler: { label: 'Minikler', min: 10, max: 13 },
    yildizlar:{ label: 'Yıldızlar',min: 13, max: 15 },
    gencler:  { label: 'Gençler',  min: 15, max: 18 },
    umitler:  { label: 'Ümitler',  min: 18, max: 20 },
    buyukler: { label: 'Büyükler',   min: 18, max: null }, // null = üst sınır yok
};
const categoryFromRange = (lo?: number | null, hi?: number | null): AgeCatKey | '' => {
    const l = Number.isFinite(lo as number) ? Number(lo) : undefined;
    const h = Number.isFinite(hi as number) ? Number(hi) : null;
    const entry = (Object.entries(AGE_CATEGORIES) as [AgeCatKey, {min:number;max:number|null}][])
        .find(([,v]) => v.min === (l ?? NaN) && v.max === (h ?? null));
    return entry ? entry[0] : '';
};


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
            // ✅ Doğru rota: Djoser → /api/auth/users/<id>/
            const { data } = await api.get<{ id:number; username:string }>(`auth/users/${id}/`);
            const uname = (data as any)?.username ?? null;
            if (uname) userCache.set(id, uname);
            return uname;
        } catch {
            return null; // bulunamazsa (403/404) null dön, ekranda fallback kullanırız
        }
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

    // Tartı günü (yeni sekme)
    const [weighEnabled, setWeighEnabled] = useState(false)
    const [weighDate, setWeighDate] = useState('')
    const [weighStart, setWeighStart] = useState('') // "HH:MM"
    const [weighEnd, setWeighEnd] = useState('')     // "HH:MM"

    const [weighInSlug, setWeighInSlug] = useState<string | null>(null);
    const [weighOpen, setWeighOpen] = useState(true);
    const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);

    // SUB: Hakem ekleme
    const [refInput, setRefInput] = useState('');
    const [referees, setReferees] = useState<Referee[]>([]);
    const [busyRef, setBusyRef] = useState(false);
    const [refFeedback, setRefFeedback] = useState<string | null>(null);

    async function addReferee() {
        const u = refInput.trim();
        setRefFeedback(null);
        if (!u) return;

        setBusyRef(true);
        try {
            const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`);
            const uid = typeof data?.id === 'number' ? data.id : -1;

            if (uid <= 0) {
                setRefFeedback('Kullanıcı bulunamadı.');
            } else if (referees.some(r => r.id === uid || r.username.toLowerCase() === u.toLowerCase())) {
                setRefFeedback('Bu kullanıcı zaten hakem listesinde.');
            } else {
                // username görünsün
                setReferees(prev => [...prev, { id: uid, username: u }]);
                setRefInput('');
            }
        } catch {
            setRefFeedback('Sunucu hatası, tekrar deneyin.');
        } finally {
            setBusyRef(false);
        }
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
                    const resolved = await Promise.all(
                        ids.map(async (id) => {
                            const uname = await usernameById(id);
                            return { id, username: uname ?? String(id) }; // bulunamazsa geçici fallback: "id"
                        })
                    );
                    setEditors(resolved);
                }

            } catch { /* yut */ }

            // Weigh-in oku (varsa)
            try {
                const wi = await api.get(`tournaments/${encodeURIComponent(editSlug)}/weigh-in/`);
                const w = wi?.data;
                if (w && typeof w.public_slug === 'string') {
                    setWeighInSlug(w.public_slug);     // ← SLUG!
                    setWeighEnabled(true);
                    setWeighDate(w.date || '');
                    setWeighStart((w.start_time || '').slice(0, 5));
                    setWeighEnd((w.end_time || '').slice(0, 5));
                    setWeighOpen(!!w.is_open);
                } else {
                    setWeighInSlug(null);
                    setWeighEnabled(false);
                }
            } catch {
                setWeighInSlug(null);
                setWeighEnabled(false);
            }
        })();
    }, [mode, editSlug]);

    // Editör ekleme
    const [editorInput, setEditorInput] = useState('')
    const [editors, setEditors] = useState<Editor[]>([])
    const [busyAdd, setBusyAdd] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)

    async function addEditor() {
        const u = editorInput.trim();
        setFeedback(null);
        if (!u) return;

        setBusyAdd(true);
        try {
            const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`);
            const uid = typeof data?.id === 'number' ? data.id : -1;

            if (uid <= 0) {
                setFeedback('Kullanıcı bulunamadı.');
            } else if (editors.some(e => e.id === uid || e.username.toLowerCase() === u.toLowerCase())) {
                setFeedback('Bu kullanıcı zaten listede.');
            } else {
                // username görünsün
                setEditors(prev => [...prev, { id: uid, username: u }]);
                setEditorInput('');
            }
        } catch {
            setFeedback('Sunucu hatası, tekrar deneyin.');
        } finally {
            setBusyAdd(false);
        }
    }


    // ───── ALT TURNUVA ALANLARI ─────
    const [subTitle, setSubTitle] = useState('')
    const [subDesc, setSubDesc] = useState('')
    const [ageCat, setAgeCat] = useState<AgeCatKey | ''>('')
    const [weightMin, setWeightMin] = useState('')
    const [weightMax, setWeightMax] = useState('')
    const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
    const [subPublic, setSubPublic] = useState(true)
    const [defaultCourt, setDefaultCourt] = useState('')
    const [subDay, setSubDay] = useState('') // ← YENİ: Gün (YYYY-MM-DD)
    const [splitCourts, setSplitCourts] = useState('');

    // "1,2,4" → [1,2,4]
    const parseCourts = (s: string): number[] =>
        (s || '')
            .split(',')
            .map(x => parseInt(x, 10))
            .filter(n => Number.isFinite(n) && n > 0);

    // SUB: Düzenleme modunda alanları doldur
    useEffect(() => {
        if (mode !== 'sub' || !editSlug) return
            ;(async () => {
            try {
                const { data } = await api.get(`subtournaments/${encodeURIComponent(editSlug)}/`)
                setSubTitle(data.title ?? '')
                setSubDesc(data.description ?? '')
                const lo = Number.isFinite(data.age_min as never) ? Number(data.age_min) : undefined;
                const hi = Number.isFinite(data.age_max as never) ? Number(data.age_max) : null;
                setAgeCat(categoryFromRange(lo, hi));
                setWeightMin((data.weight_min ?? '').toString())
                setWeightMax((data.weight_max ?? '').toString())
                setGender((data.gender as never) || 'M')
                setSubPublic(!!data.public)
                setDefaultCourt(String(data.court_no ?? ''))
                setSubDay((data.day as string) ?? '') // ← YENİ: API’den oku
                if (Array.isArray((data as any).referees)) {
                    const ids = Array.from(new Set<number>(data.referees as number[]));
                    const resolvedRefs = await Promise.all(
                        ids.map(async (id) => {
                            const uname = await usernameById(id);
                            return { id, username: uname ?? String(id) };
                        })
                    );
                    setReferees(resolvedRefs);
                }

                // Backend'den gelen preferred_courts → UI string'ine yaz
                const pc = Array.isArray((data as any)?.preferred_courts)
                    ? ((data as any).preferred_courts as any[])
                        .map(n => parseInt(String(n), 10))
                        .filter(n => Number.isFinite(n) && n > 0)
                    : [];
                setSplitCourts(pc.join(','));
            } catch { /* empty */ }
        })()
    }, [mode, editSlug])

    // Alt turnuva için parentId
    const subParentId = (() => {
        const p = Number(sp.get('parent') || '')
        if (!isNaN(p) && p > 0) return p
        if (defaultParentId) return defaultParentId
        return undefined
    })()

    // Adımlar (ANA için Tartı Günü eklendi)
    const steps = useMemo(
        () =>
            mode === 'main'
                ? (['Genel Bilgiler', 'Tartı Günü', 'Organizasyon', 'Özet'] as const)
                : (['Genel Bilgiler', 'Özet'] as const),
        [mode],
    )
    const [step, setStep] = useState(0)

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
            const vTitle = subTitle.trim().length >= 3;
            const vAge = !!ageCat; // kategori seçilmiş olmalı
            return vTitle && vAge && (!!subParentId || !!editSlug);
        }
        return true
    }, [mode, step, steps, title, seasonYear, startDate, endDate, subTitle, ageCat, subParentId, editSlug, weighEnabled, weighDate, weighStart, weighEnd])

    async function save() {
        if (mode === 'main') {
            // owner id'yi çöz
            async function resolveOwnerId(): Promise<number> {
                const u = (localStorage.getItem('username') || '').trim()
                if (!u) return 0
                try {
                    const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`)
                    return typeof data?.id === 'number' ? data.id : 0
                } catch {
                    return 0
                }
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
                    // 1) Ana turnuva PATCH (aynı)
                    const { data: patched } = await api.patch(
                        `tournaments/${encodeURIComponent(editSlug)}/`,
                        basePayload
                    );
                    const tid = editingTournamentId ?? patched?.id ?? null;

                    // 2) Weigh-in create/update
                    if (weighEnabled) {
                        const wiPayload = {
                            tournament: tid ?? 0,
                            date: weighDate,
                            start_time: weighStart,  // "HH:MM"
                            end_time:   weighEnd,    // "HH:MM"
                            is_open:    weighOpen,
                        };

                        if (weighInSlug) {
                            // ← public-slug ile PATCH
                            await api.patch(`weighins/${encodeURIComponent(weighInSlug)}/`, wiPayload);
                        } else {
                            // yoksa oluştur
                            const { data: createdWI } = await api.post('weighins/', wiPayload);
                            // (opsiyonel) sonradan tekrar düzenlemede işinize yarar:
                            if (createdWI?.public_slug) setWeighInSlug(createdWI.public_slug);
                        }
                    } else if (weighInSlug) {
                        // Tartı devre dışıysa aç-kapa bilgisi için PATCH (veya isteğe göre DELETE)
                        await api.patch(`weighins/${encodeURIComponent(weighInSlug)}/`, { is_open: false });
                    }
                } else {
                    // CREATE (aynı)
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
            } catch {
                alert('İşlem başarısız.');
            }
            return;
        }

        // ALT TURNUVA
        if (editSlug) {
            try {
                await api.patch(`subtournaments/${encodeURIComponent(editSlug)}/`, {
                    title: subTitle,
                    description: subDesc,
                    ...( (() => {
                        const c = ageCat ? AGE_CATEGORIES[ageCat] : null;
                        return c ? { age_min: c.min, age_max: (c.max ?? 999) } : {};
                    })() ),
                    weight_min: weightMin,
                    weight_max: weightMax,
                    gender,
                    public: subPublic,
                    ...(defaultCourt ? { court_no: Number(defaultCourt) } : {}),
                    ...(subDay ? { day: subDay } : {}), // ← YENİ: gün gönder
                    referees: referees.map(r => r.id),

                    // BE’de kalıcı — boşsa [] gönderir (temizler)
                    preferred_courts: parseCourts(splitCourts),
                })
                await qc.invalidateQueries({ queryKey: ['subtournaments'] })
                navigate(-1)
            } catch {
                alert('Alt turnuva güncellenemedi.')
            }
            return
        }

        // OLUŞTURMA
        if (!subParentId) {
            alert('Ana turnuva ID bulunamadı.')
            return
        }
        try {
            const { data: created } = await api.post('subtournaments/', {
                tournament: subParentId,
                title: subTitle,
                description: subDesc,
                ...( (() => {
                    const c = ageCat ? AGE_CATEGORIES[ageCat] : null;
                    return c ? { age_min: c.min, age_max: (c.max ?? 999) } : {};
                })() ),
                weight_min: weightMin,
                weight_max: weightMax,
                gender,
                public: subPublic,
                ...(defaultCourt ? { court_no: Number(defaultCourt) } : {}),
                ...(subDay ? { day: subDay } : {}), // ← YENİ
                referees: referees.map(r => r.id),

                preferred_courts: parseCourts(splitCourts),
            })
            await qc.invalidateQueries({ queryKey: ['subtournaments'] })
            navigate(-1)
        } catch {
            alert('Alt turnuva oluşturulamadı.')
        }
    }

    const onBack = () => {
        if (step === 0) navigate('/', { replace: true })
        else setStep(s => Math.max(0, s - 1))
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
                                ? (editSlug ? 'Ana Turnuva Düzenle' : 'Ana Turnuva Oluştur')
                                : (editSlug ? 'Alt Turnuva Düzenle' : 'Alt Turnuva Oluştur')}
                        </h1>
                    </div>
                    <div className="text-sm text-gray-400">{step + 1}/{steps.length}</div>
                </div>
                <div className="px-3 pb-3">
                    <div className="flex gap-2 flex-wrap">
                        {steps.map((s, i) => (
                            <button
                                key={s}
                                onClick={() => setStep(i)}
                                className={`px-3 py-1.5 rounded-full text-xs ${i === step ? 'bg-sky-600 text-white' : 'bg-[#3a3f49] hover:bg-[#444956] text-gray-200'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </GradientFrame>

            {/* İçerik */}
            <GradientFrame className="mt-6">
                <div className="p-6 space-y-6">
                    {/* MAIN: Genel Bilgiler */}
                    {mode === 'main' && steps[step] === 'Genel Bilgiler' && (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled label="Başlık" value={title} set={setTitle} placeholder="2025 İstanbul Şampiyonası" />
                                <Labeled label="Sezon Yılı" type="number" value={seasonYear} set={setSeasonYear} placeholder="2025" />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled label="Şehir" value={city} set={setCity} />
                                <Labeled label="Mekan" value={venue} set={setVenue} />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled label="Başlangıç Tarihi" type="date" value={startDate} set={setStartDate} />
                                <Labeled label="Bitiş Tarihi" type="date" value={endDate} set={setEndDate} />
                            </div>
                            <TextArea label="Açıklama" value={description} set={setDescription} />
                            <Toggle checked={isPublic} onChange={setIsPublic}>Herkes</Toggle>
                        </>
                    )}

                    {/* MAIN: Tartı Günü (YENİ) */}
                    {mode === 'main' && steps[step] === 'Tartı Günü' && (
                        <>
                            <Toggle checked={weighEnabled} onChange={setWeighEnabled}>Tartı Günü Aktif</Toggle>

                            {weighEnabled && (
                                <>
                                    <div className="grid gap-6 md:grid-cols-3">
                                        <Labeled label="Tarih" type="date" value={weighDate} set={setWeighDate} />
                                        <Labeled label="Başlangıç Saati" type="time" value={weighStart} set={setWeighStart} />
                                        <Labeled label="Bitiş Saati" type="time" value={weighEnd} set={setWeighEnd} />
                                    </div>

                                    {/* YENİ: Randevu Alımı Açık/Kapalı */}
                                    <div className="pt-2">
                                        <Toggle checked={weighOpen} onChange={setWeighOpen}>
                                            Randevu Alımı Açık
                                        </Toggle>
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
                                                <span>{e.username}</span>
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

                    {/* ALT: Genel Bilgiler (kilo integer + varsayılan kort no + GÜN eklendi) */}
                    {mode === 'sub' && steps[step] === 'Genel Bilgiler' && (
                        <>
                            <Labeled label="Alt Turnuva Başlığı" value={subTitle} set={setSubTitle} />
                            <LabeledSelect label="Cinsiyet" value={gender} set={setGender} options={{ M: 'Erkek', F: 'Kadın', O: 'Karma' }} />
                            <TextArea label="Açıklama" value={subDesc} set={setSubDesc} />
                            <LabeledSelect
                                label="Yaş Kategorisi"
                                value={ageCat}
                                set={(v)=> setAgeCat(v as AgeCatKey | '')}
                                options={Object.fromEntries(Object.entries(AGE_CATEGORIES).map(([k, v]) => [k, v.label]))}
                                placeholder="Seçiniz"
                            />
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled
                                    label="Kilo Min (kg)"
                                    value={weightMin}
                                    set={(v) => setWeightMin(v.replace(/\D/g, '').slice(0, 3))}
                                    type="number"
                                />
                                <Labeled
                                    label="Kilo Max (kg)"
                                    value={weightMax}
                                    set={(v) => setWeightMax(v.replace(/\D/g, '').slice(0, 3))}
                                    type="number"
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <Labeled
                                    label="Varsayılan Kort No (ops.)"
                                    value={defaultCourt}
                                    set={(v) => setDefaultCourt(v.replace(/\D/g, '').slice(0, 3))}
                                    type="number"
                                    placeholder="1"
                                />
                                <Labeled
                                    label="Gün (Tarih)"
                                    value={subDay}
                                    set={setSubDay}
                                    type="date"
                                />
                            </div>

                            {/* ⬇️ YENİ: çoklu kort ipucu */}
                            <Labeled
                                label="Dağıtılacak Kortlar (ops., virgülle)"
                                value={splitCourts}
                                set={(v) => {
                                    // sadece 0-9 ve virgül; ardışık virgülleri tekle
                                    const cleaned = v.replace(/[^\d,]/g, '').replace(/,+/g, ',');
                                    setSplitCourts(cleaned);
                                }}
                                placeholder="örn. 1,2 veya 2,3,4"
                            />
                            <p className="text-[11px] text-gray-400 -mt-4">
                                Doldurursanız, şablon kaydederken maçlar BYE’lar atlanarak sıraya göre bu kortlara eşit parçalara bölünür.
                            </p>
                            <Toggle checked={subPublic} onChange={setSubPublic}>Herkes</Toggle>

                            <div className="mt-4">
                                <label className="block text-sm mb-1">Hakem Ekle (kullanıcı adı)</label>
                                <div className="flex gap-2">
                                    <input
                                        value={refInput}
                                        onChange={e => setRefInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && refInput.trim() && !busyRef) {
                                                addReferee();
                                            }
                                        }}
                                        className="flex-1 bg-[#1f2229] rounded px-3 py-2"
                                    />
                                    <button
                                        disabled={busyRef || !refInput.trim()}
                                        onClick={addReferee}
                                        className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50"
                                        type="button"
                                    >
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
                                                    <span>{r.username}</span>
                                                    <button
                                                        onClick={() => setReferees(list => list.filter((_, idx) => idx !== i))}
                                                        className="rounded bg-gray-700 px-2 py-0.5 text-xs"
                                                        type="button"
                                                    >
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
                            propsSub={{
                                subTitle, gender,
                                ageLabel: ageCat ? AGE_CATEGORIES[ageCat].label : '—',
                                weightMin, weightMax, subPublic,
                                day: subDay,
                                prefCourts: splitCourts, // ⬅️
                            }}
                        />
                    )}

                    {/* Navigasyon */}
                    <div className="flex justify-between pt-4">
                        <button onClick={onBack} className="rounded bg-[#3a3f49] px-3 py-2">Geri</button>
                        {step < steps.length - 1 ? (
                            <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="rounded bg-sky-600 px-3 py-2 disabled:opacity-40">
                                İleri
                            </button>
                        ) : (
                            <button onClick={save} className="rounded bg-emerald-600 px-3 py-2">Kaydet</button>
                        )}
                    </div>
                </div>
            </GradientFrame>
        </div>
    )
}

/** Yardımcı bileşenler **/
function GradientFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`wizard-frame ${className}`}>
            <div className="inner">{children}</div>
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
function LabeledSelect<T extends string>({ label, value, set, options, placeholder }: {
    label: string
    value: T
    set: (v: T) => void
    options: Record<string, string>
    placeholder?: string
}) {
    return (
        <div className="flex flex-col">
            <label className="mb-1">{label}</label>
            <select value={value} onChange={e => set(e.target.value as T)} className="rounded bg-[#1f2229] px-3 py-2">
                {placeholder && <option value="" disabled> {placeholder} </option>}
                {Object.entries(options).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                ))}
            </select>
        </div>
    )
}
function TextArea({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
    return (
        <div>
            <label className="mb-1 block">{label}</label>
            <textarea value={value} onChange={e => set(e.target.value)} className="h-28 w-full rounded bg-[#1f2229] px-3 py-2" />
        </div>
    )
}
function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
    return (
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <span>{children}</span>
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
        subTitle: string; gender: 'M'|'F'|'O'; ageLabel: string;
        weightMin: string; weightMax: string; subPublic: boolean; day: string;
        prefCourts?: string;
    }
}) {
    const { title, seasonYear, city, venue, startDate, endDate, isPublic, editors } = propsMain
    const { subTitle, gender, ageLabel, weightMin, weightMax, subPublic, day } = propsSub
    return (
        <div className="space-y-4 text-sm">
            {mode === 'main' ? (
                <div className="grid gap-4 md:grid-cols-2">
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
                <div className="grid gap-4 md:grid-cols-2">
                    <div><b>Başlık:</b> {subTitle}</div>
                    <div><b>Cinsiyet:</b> {gender === 'M' ? 'Erkek' : gender === 'F' ? 'Kadın' : 'Karma'}</div>
                    <div><b>Yaş:</b> {ageLabel}</div>
                    <div><b>Kilo:</b> {(weightMin || '?') + '–' + (weightMax || '?')} kg</div>
                    <div><b>Gün:</b> {day || '—'}</div>
                    <div><b>Herkes:</b> {subPublic ? 'Evet' : 'Hayır'}</div>
                    <div><b>Dağıtım Kortları:</b> {propsSub.prefCourts || '—'}</div>
                </div>
            )}
        </div>
    )
}
