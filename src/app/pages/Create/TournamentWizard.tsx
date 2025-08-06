/* =========================================================================
   TournamentWizard – Ana / Alt Turnuva Sihirbazı
   - Dashboard'tan gelince mode=main → POST /tournaments/
   - Alt turnuva listesinden gelince mode=sub → POST /subtournaments/
   ========================================================================= */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Mode = 'main' | 'sub';

export default function TournamentWizard({
                                             mode: initialMode,
                                             defaultParentId,
                                         }: {
    mode: Mode;
    defaultParentId?: number;
}) {
    const nav = useNavigate();
    const qc  = useQueryClient();
    const [sp] = useSearchParams();

    // URL parametresi mode öncelikli
    const mode: Mode = (sp.get('mode') as Mode) || initialMode || 'main';

    /* ───────── MAIN: Genel Bilgiler ───────── */
    const [title, setTitle]           = useState('');
    const [seasonYear, setSeasonYear] = useState<string>('');
    const [city, setCity]             = useState('');
    const [venue, setVenue]           = useState('');
    const [startDate, setStartDate]   = useState('');
    const [endDate, setEndDate]       = useState('');
    const [description, setDesc]      = useState('');
    const [isPublic, setIsPublic]     = useState(true);

    /* ───────── MAIN: Editörler (lookup) ───────── */
    type Editor = { id: number; username: string };
    const [editorInput, setEditorInput] = useState('');
    const [editors, setEditors]         = useState<Editor[]>([]);
    const [busyAdd, setBusyAdd]         = useState(false);
    const [feedback, setFeedback]       = useState<string | null>(null);

    async function addEditor() {
        const u = editorInput.trim();
        setFeedback(null);
        if (!u) return;
        if (editors.some(e => e.username.toLowerCase() === u.toLowerCase())) {
            setFeedback('Bu kullanıcı zaten listede.');
            return;
        }
        setBusyAdd(true);
        try {
            const { data } = await api.get<{ id: number }>(`users/lookup/${encodeURIComponent(u)}/`);
            if (!data || typeof data.id !== 'number') {
                setFeedback('Beklenmeyen yanıt alındı.');
            } else if (data.id === -1) {
                setFeedback('Böyle bir kullanıcı bulunamadı.');
            } else {
                setEditors(prev => [...prev, { id: data.id, username: u }]);
                setEditorInput('');
                setFeedback('Editör eklendi.');
                setTimeout(() => setFeedback(null), 1800);
            }
        } finally {
            setBusyAdd(false);
        }
    }
    const removeEditor = (idx: number) =>
        setEditors(list => list.filter((_, i) => i !== idx));

    /* ───────── SUB: Alt turnuva bilgileri ───────── */
    const [subTitle, setSubTitle]       = useState('');
    const [subDesc, setSubDesc]         = useState('');
    const [ageMin, setAgeMin]           = useState<string>(''); // sayısal giriş
    const [ageMax, setAgeMax]           = useState<string>('');
    const [weightMin, setWeightMin]     = useState<string>(''); // string isteniyor
    const [weightMax, setWeightMax]     = useState<string>('');
    const [gender, setGender]           = useState<'M' | 'F' | 'O'>('M');
    const [subPublic, setSubPublic]     = useState(true);
    const [subParentId] = useState<number | undefined>(() => {
        // 1) ?parent=... geldi mi?
        const qsParent = sp.get('parent');
        if (qsParent && !isNaN(Number(qsParent))) return Number(qsParent);

        // 2) Props’tan geldiyse
        if (defaultParentId) return defaultParentId;

        // 3) ctx=public_slug ile sessionStorage eşleşmesi
        const slug = sp.get('ctx');
        if (slug) {
            try {
                const map = JSON.parse(sessionStorage.getItem('tournament_slug_to_id') || '{}');
                const id = map[slug];
                if (typeof id === 'number') return id;
            } catch { /* empty */ }
        }
        return undefined;
    });

    /* ───────── Adımlar ───────── */
    const steps = useMemo(() => {
        return mode === 'main'
            ? (['Genel Bilgiler', 'Organizasyon', 'Özet'] as const)
            : (['Genel Bilgiler', 'Özet'] as const);
    }, [mode]);

    const [step, setStep] = useState(0);

    const canNext = useMemo(() => {
        if (mode === 'main') {
            if (steps[step] === 'Genel Bilgiler') {
                const validTitle = title.trim().length >= 3;
                const validYear  = /^\d{4}$/.test(seasonYear);
                const validDates = !!startDate && !!endDate && startDate <= endDate;
                return validTitle && validYear && validDates;
            }
            return true;
        } else {
            if (steps[step] === 'Genel Bilgiler') {
                const validTitle = subTitle.trim().length >= 3;
                const aMin = ageMin === '' ? undefined : Number(ageMin);
                const aMax = ageMax === '' ? undefined : Number(ageMax);
                const orderOk = aMin == null || aMax == null || aMin <= aMax;
                const hasParent = subParentId != null;          // ← parent ID zorunlu
                return validTitle && orderOk && hasParent;
            }
            return true;
        }
    }, [mode, step, steps, title, seasonYear, startDate, endDate, subTitle, ageMin, ageMax]);

    /* ───────── Kaydet ───────── */
    async function save() {
        if (mode === 'main') {
            const payload = {
                title,
                season_year: Number(seasonYear) || 0,
                city,
                venue,
                start_date: startDate,
                end_date:   endDate,
                description: setDesc ? description : description, // sadece okunurluk
                public: isPublic,
                editors: editors.map(e => e.id),
            };

            try {
                await api.post('/tournaments/', payload);
                await qc.invalidateQueries({ queryKey: ['tournaments'] });
                nav('/', { replace: true });
            } catch {
                alert('Ana turnuva oluşturulamadı. Lütfen bilgileri kontrol edin.');
            }
            return;
        }

        // --- SUB ---
        if (subParentId == null) {
            alert('Ana turnuva bilgisi bulunamadı. Lütfen listeden tekrar deneyin.');
            return;
        }
        const payload = {
            tournament: subParentId,      // ← zorunlu alan
            title: subTitle,
            description: subDesc,
            age_min: ageMin === '' ? 0 : Number(ageMin),
            age_max: ageMax === '' ? 0 : Number(ageMax),
            weight_min: weightMin,        // backend string bekliyor
            weight_max: weightMax,
            gender,
            public: subPublic,
        };

        try {
            await api.post('/subtournaments/', payload);
            const ctxSlug = sp.get('ctx');
            if (ctxSlug) await qc.invalidateQueries({ queryKey: ['subtournaments', ctxSlug] });
            nav(-1);
        } catch {
            alert('Alt turnuva oluşturulamadı. Lütfen bilgileri kontrol edin.');
        }
    }

    /* ───────── UI ───────── */
    return (
        <div className="mx-auto max-w-5xl">
            {/* Başlık şeridi */}
            <div className="rounded-xl p-[1px] bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500">
                <div className="rounded-xl bg-[#2b2e36]">
                    <div className="px-6 py-5 flex items-center justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-gray-400">Turnuva Sihirbazı</div>
                            <h1 className="text-2xl font-bold">
                                {mode === 'main' ? 'Ana Turnuva Oluştur' : 'Alt Turnuva Oluştur'}
                            </h1>
                        </div>
                        <div className="text-sm text-gray-400">{step + 1}/{steps.length}</div>
                    </div>

                    {/* Sekmeler */}
                    <div className="px-3 pb-3">
                        <div className="flex gap-2 flex-wrap">
                            {steps.map((s, i) => (
                                <button
                                    key={s}
                                    onClick={() => setStep(i)}
                                    className={`px-3 py-1.5 rounded-full text-xs transition
                    ${i === step ? 'bg-sky-600 text-white' : 'bg-[#3a3f49] hover:bg-[#444956] text-gray-200'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* İçerik kartı */}
            <div className="mt-6 rounded-xl bg-[#2d3038] p-6 space-y-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,.6)]">
                {/* MAIN: Genel Bilgiler */}
                {mode === 'main' && steps[step] === 'Genel Bilgiler' && (
                    <section className="grid gap-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Başlık</label>
                                <input
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Örn: 2025 İstanbul Şampiyonası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Sezon yılı</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={seasonYear}
                                    onChange={(e) => setSeasonYear(e.target.value)}
                                    placeholder="2025"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Şehir</label>
                                <input
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="İstanbul"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Mekan</label>
                                <input
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={venue}
                                    onChange={(e) => setVenue(e.target.value)}
                                    placeholder="Sinan Erdem"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Başlangıç tarihi</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Bitiş tarihi</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Açıklama</label>
                            <textarea
                                className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2 min-h-28"
                                value={description}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Kısa açıklama…"
                            />
                        </div>

                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} />
                            Public
                        </label>
                    </section>
                )}

                {/* MAIN: Organizasyon */}
                {mode === 'main' && steps[step] === 'Organizasyon' && (
                    <section className="grid gap-6">
                        <div>
                            <label className="block text-sm mb-1">Editör ekle (kullanıcı adı)</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={editorInput}
                                    onChange={(e) => setEditorInput(e.target.value)}
                                    placeholder="ornek_kullanici"
                                />
                                <button
                                    disabled={busyAdd || !editorInput.trim()}
                                    onClick={addEditor}
                                    className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
                                >
                                    Ekle
                                </button>
                            </div>
                            {feedback && <p className="text-sm mt-2 text-gray-300">{feedback}</p>}
                        </div>

                        <div className="bg-[#23252b] rounded p-3">
                            <div className="text-sm font-medium mb-2">Seçilen editörler</div>
                            {editors.length === 0 ? (
                                <p className="text-xs text-gray-400">Henüz editör eklenmedi.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {editors.map((e, i) => (
                                        <li key={e.id} className="flex items-center justify-between text-sm">
                                            <span>{e.username}</span>
                                            <button className="px-2 py-0.5 text-xs bg-gray-700 rounded" onClick={() => removeEditor(i)}>
                                                Kaldır
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-[11px] text-gray-400 mt-2">
                                Kullanıcı adı her eklemede <code>GET users/lookup/&lt;username&gt;/</code> ile doğrulanır.
                            </p>
                        </div>
                    </section>
                )}

                {/* SUB: Genel Bilgiler */}
                {mode === 'sub' && steps[step] === 'Genel Bilgiler' && (
                    <section className="grid gap-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Başlık</label>
                                <input
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={subTitle}
                                    onChange={(e) => setSubTitle(e.target.value)}
                                    placeholder="Örn: Minikler 50–55kg Erkek"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Cinsiyet</label>
                                <select
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value as never)}
                                >
                                    <option value="M">Erkek</option>
                                    <option value="F">Kadın</option>
                                    <option value="O">Karma</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Açıklama</label>
                            <textarea
                                className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2 min-h-24"
                                value={subDesc}
                                onChange={(e) => setSubDesc(e.target.value)}
                                placeholder="Kısa açıklama…"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Yaş Min</label>
                                <input
                                    inputMode="numeric"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={ageMin}
                                    onChange={(e)=>setAgeMin(e.target.value.replace(/\D/g,'').slice(0,2))}
                                    placeholder="örn. 12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Yaş Max</label>
                                <input
                                    inputMode="numeric"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={ageMax}
                                    onChange={(e)=>setAgeMax(e.target.value.replace(/\D/g,'').slice(0,2))}
                                    placeholder="örn. 15"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Kilo Min (kg)</label>
                                <input
                                    inputMode="decimal"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={weightMin}
                                    onChange={(e)=>setWeightMin(e.target.value.replace(/[^\d.,-]/g,'').replace(',', '.').slice(0,6))}
                                    placeholder="örn. 50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Kilo Max (kg)</label>
                                <input
                                    inputMode="decimal"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={weightMax}
                                    onChange={(e)=>setWeightMax(e.target.value.replace(/[^\d.,-]/g,'').replace(',', '.').slice(0,6))}
                                    placeholder="örn. 55"
                                />
                            </div>
                        </div>

                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={subPublic} onChange={(e)=>setSubPublic(e.target.checked)} />
                            Public
                        </label>

                        {(ageMin && ageMax) && Number(ageMin) > Number(ageMax) && (
                            <p className="text-amber-400 text-sm">Uyarı: Yaş min, yaş max’tan büyük olamaz.</p>
                        )}
                    </section>
                )}

                {/* ÖZET (main/sub ortak) */}
                {steps[step] === 'Özet' && (
                    <section className="grid gap-4">
                        <div className="bg-[#23252b] rounded p-4 grid gap-2 text-sm">
                            {mode === 'main' ? (
                                <>
                                    <div><b>Başlık:</b> {title || '-'}</div>
                                    <div><b>Sezon:</b> {seasonYear || '-'}</div>
                                    <div><b>Şehir:</b> {city || '-'}</div>
                                    <div><b>Mekan:</b> {venue || '-'}</div>
                                    <div><b>Tarih:</b> {startDate || '-'} – {endDate || '-'}</div>
                                    <div><b>Public:</b> {isPublic ? 'Yes' : 'No'}</div>
                                    <div><b>Editörler:</b> {editors.length ? editors.map(e=>e.username).join(', ') : '-'}</div>
                                </>
                            ) : (
                                <>
                                    <div><b>Başlık:</b> {subTitle || '-'}</div>
                                    <div><b>Cinsiyet:</b> {gender === 'M' ? 'Erkek' : gender === 'F' ? 'Kadın' : 'Karma'}</div>
                                    <div><b>Yaş:</b> {(ageMin || '-')} – {(ageMax || '-')}</div>
                                    <div><b>Kilo:</b> {(weightMin || '-')} – {(weightMax || '-')}</div>
                                    <div><b>Public:</b> {subPublic ? 'Yes' : 'No'}</div>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {/* Navigasyon */}
                <footer className="flex justify-between pt-2">
                    <button
                        className="px-3 py-2 rounded bg-[#3a3f49] hover:bg-[#444956] disabled:opacity-50"
                        onClick={() => setStep(s => Math.max(0, s - 1))}
                        disabled={step === 0}
                    >
                        Geri
                    </button>

                    {step < steps.length - 1 ? (
                        <button
                            className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
                            disabled={!canNext}
                            onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                        >
                            İleri
                        </button>
                    ) : (
                        <button
                            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
                            onClick={save}
                        >
                            Oluştur
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
