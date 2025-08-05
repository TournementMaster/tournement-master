/* =========================================================================
   FILE: src/app/pages/Create/TournamentWizard.tsx
   AMAÇ
   - Ana sayfadan açılırsa: ANA turnuva oluştur (sidebar RootLayout tarafında gizleniyor).
   - /bracket/:id içinden açılırsa: ALT turnuva (parent otomatik/geçilebilir).
   - ALT turnuva için "Kategori Bilgileri" adımı: Tournament (parent), Age/Weight,
     Gender, Public; görsel olarak premium.
   - Güvenli POST /api/brackets/ → yalnız minimal payload (title/type/participants/…).
   ========================================================================= */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api.tsx';
import { useBrackets, type BracketSummary } from '../../hooks/useBracket.tsx';

/* ---- Tipler ---- */
type SihirbazModu = 'main' | 'sub';
type Format = 'single' | 'double' | 'group' | 'round_robin';

type CreateBracketDTO = {
    title: string;
    type: Format;
    participants: number;
    progress: number;
    status: BracketSummary['status'];
    category: NonNullable<BracketSummary['category']>;
    parentId: number | null;
};

/* Sahip/Düzenleyici için (opsiyonel) */
type Kullanici = { id: number; username: string };

function useUsers() {
    return useQuery<Kullanici[], Error>({
        queryKey: ['users'],
        queryFn: async () => {
            try {
                const { data } = await api.get<Kullanici[]>('users/');
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        },
        staleTime: 120_000,
        refetchOnWindowFocus: false,
    });
}

/* Düzenleyici seçici – ana turnuva için */
function EditorSecici({
                          users,
                          secilenler,
                          setSecilenler,
                      }: {
    users: Kullanici[];
    secilenler: number[];
    setSecilenler: (ids: number[]) => void;
}) {
    const [filtreA, setFiltreA] = useState('');
    const [filtreB, setFiltreB] = useState('');
    const musait = users.filter(
        (u) => !secilenler.includes(u.id) && u.username.toLowerCase().includes(filtreA.toLowerCase()),
    );
    const secili = users.filter(
        (u) => secilenler.includes(u.id) && u.username.toLowerCase().includes(filtreB.toLowerCase()),
    );
    const ekle = (id: number) => setSecilenler([...new Set([...secilenler, id])]);
    const cikar = (id: number) => setSecilenler(secilenler.filter((x) => x !== id));

    return (
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="bg-[#23252b] rounded p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Uygun düzenleyiciler</div>
                    <input
                        value={filtreA}
                        onChange={(e) => setFiltreA(e.target.value)}
                        placeholder="Filtrele"
                        className="bg-gray-700 rounded px-2 py-1 text-sm w-36"
                    />
                </div>
                <ul className="max-h-56 overflow-auto space-y-1">
                    {musait.map((u) => (
                        <li key={u.id} className="flex items-center justify-between text-sm">
                            <span>{u.username}</span>
                            <button className="px-2 py-0.5 text-xs bg-gray-700 rounded" onClick={() => ekle(u.id)}>
                                Seç →
                            </button>
                        </li>
                    ))}
                    {musait.length === 0 && <li className="text-xs text-gray-400">Boş</li>}
                </ul>
            </div>

            <div className="flex items-center justify-center">
                <span className="text-gray-400 text-sm">⇄</span>
            </div>

            <div className="bg-[#23252b] rounded p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Seçilen düzenleyiciler</div>
                    <input
                        value={filtreB}
                        onChange={(e) => setFiltreB(e.target.value)}
                        placeholder="Filtrele"
                        className="bg-gray-700 rounded px-2 py-1 text-sm w-36"
                    />
                </div>
                <ul className="max-h-56 overflow-auto space-y-1">
                    {secili.map((u) => (
                        <li key={u.id} className="flex items-center justify-between text-sm">
                            <span>{u.username}</span>
                            <button className="px-2 py-0.5 text-xs bg-gray-700 rounded" onClick={() => cikar(u.id)}>
                                Kaldır
                            </button>
                        </li>
                    ))}
                    {secili.length === 0 && <li className="text-xs text-gray-400">Boş</li>}
                </ul>
            </div>
        </div>
    );
}

/* ---- Bileşen ---- */
export default function TournamentWizard({
                                             mode,
                                             defaultParentId,
                                         }: {
    mode: SihirbazModu;
    defaultParentId?: number;
}) {
    const nav = useNavigate();
    const qc = useQueryClient();

    const { data: brackets = [] } = useBrackets();
    const anaTurnuvalar = useMemo(
        () => brackets.filter((b) => (b.category ?? (b.parentId == null ? 'main' : 'sub')) === 'main'),
        [brackets],
    );

    const { data: users = [] } = useUsers();

    /* Temel form */
    const [baslik, setBaslik] = useState('');
    const [format, setFormat] = useState<Format>('single');
    const [katilimci, setKatilimci] = useState<number>(8);

    /* Ana turnuva bilgileri (opsiyonel) */
    const [sahipId, setSahipId] = useState<number | ''>('');
    const [editorIds, setEditorIds] = useState<number[]>([]);

    /* ALT turnuva: Kategori alanları */
    const [parentId, setParentId] = useState<number | ''>(defaultParentId ?? '');
    const [yasMin, setYasMin] = useState<number | ''>('');
    const [yasMax, setYasMax] = useState<number | ''>('');
    const [kiloMin, setKiloMin] = useState<number | ''>('');
    const [kiloMax, setKiloMax] = useState<number | ''>('');
    const [cinsiyet, setCinsiyet] = useState<'male' | 'female' | 'mixed' | ''>('');
    const [isPublic, setIsPublic] = useState(false);

    /* Adımlar:
       - ALT turnuva için 'Kategori Bilgileri' adımı eklendi ve içinde parent seçimi de var. */
    const adimlar = useMemo(() => {
        if (mode === 'sub') {
            return ['Genel Bilgiler', 'Format', 'Kategori Bilgileri', 'Özet'] as const;
        }
        return ['Genel Bilgiler', 'Format', 'Organizasyon', 'Özet'] as const;
    }, [mode]);

    const [adim, setAdim] = useState(0);

    function ileriAktifMi() {
        const a = adimlar[adim];
        if (a === 'Genel Bilgiler') return baslik.trim().length >= 3;
        if (a === 'Format') return katilimci >= 2;
        if (a === 'Kategori Bilgileri') {
            // Parent zorunlu; sayısal doğrulamalar basitçe yapılır (min<=max ise)
            if (!defaultParentId && !parentId) return false;
            if (yasMin !== '' && yasMax !== '' && Number(yasMin) > Number(yasMax)) return false;
            if (kiloMin !== '' && kiloMax !== '' && Number(kiloMin) > Number(kiloMax)) return false;
            return true;
        }
        return true;
    }

    function hataGoster(err: unknown) {
        if (isAxiosError(err)) {
            const kod = err.response?.status ?? '???';
            const detay =
                (typeof err.response?.data === 'string'
                    ? err.response?.data
                    : JSON.stringify(err.response?.data, null, 2)) || err.message;
            alert(`Oluşturma başarısız (HTTP ${kod}).\n\n${detay}`);
            console.error('Create failed:', err.response ?? err);
        } else {
            alert('Oluşturma başarısız (bilinmeyen hata).');
            console.error('Create failed (unknown):', err);
        }
    }

    const kaydet = async () => {
        const payload: CreateBracketDTO = {
            title: baslik,
            type: format,
            participants: katilimci,
            progress: 0,
            status: 'pending',
            category: mode === 'main' ? 'main' : 'sub',
            parentId: mode === 'sub' ? (defaultParentId ?? Number(parentId)) : null,
        };

        // NOT: Kategori alanları (yas/kilo/cinsiyet/public) şu an backend’e gönderilmiyor.
        // Schema hazır olduğunda payload’a eklenecek: örn `{ ...payload, category_filters: {...} }`.

        // Optimistic
        const tempId = Date.now();
        qc.setQueryData<BracketSummary[]>(['brackets'], (old = []) => [
            ...old,
            {
                id: tempId,
                title: payload.title,
                type: payload.type,
                participants: payload.participants,
                progress: payload.progress,
                status: payload.status,
                category: payload.category,
                parentId: payload.parentId,
            },
        ]);

        try {
            const { data: created } = await api.post<BracketSummary>('brackets/', payload);
            qc.setQueryData<BracketSummary[]>(['brackets'], (old = []) =>
                old.map((x) => (x.id === tempId ? created : x)),
            );
        } catch (err) {
            qc.setQueryData<BracketSummary[]>(['brackets'], (old = []) => old.filter((x) => x.id !== tempId));
            hataGoster(err);
            return;
        }

        await qc.invalidateQueries({ queryKey: ['brackets'] });
        nav('/');
    };

    /* ---- UI ---- */
    return (
        <div className="mx-auto max-w-5xl">
            {/* Başlık şeridi */}
            <div className="rounded-xl p-[1px] bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500">
                <div className="rounded-xl bg-[#2b2e36]">
                    <div className="px-6 py-5 flex items-center justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-gray-400">Turnuva Sihirbazı</div>
                            <h1 className="text-2xl font-bold">
                                {mode === 'main' ? 'Ana Turnuva Oluştur' : 'Alt Turnuva Oluştur'}
                            </h1>
                        </div>
                        <div className="text-sm text-gray-400">
                            {adim + 1}/{adimlar.length}
                        </div>
                    </div>

                    {/* Adım butonları */}
                    <div className="px-3 pb-3">
                        <div className="flex gap-2 flex-wrap">
                            {adimlar.map((s, i) => (
                                <button
                                    key={s}
                                    onClick={() => setAdim(i)}
                                    className={`px-3 py-1.5 rounded-full text-xs transition
                    ${i === adim ? 'bg-sky-600 text-white' : 'bg-[#3a3f49] hover:bg-[#444956] text-gray-200'}`}
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
                {/* 1) Genel Bilgiler */}
                {adimlar[adim] === 'Genel Bilgiler' && (
                    <section className="grid gap-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Başlık</label>
                                <input
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={baslik}
                                    onChange={(e) => setBaslik(e.target.value)}
                                    placeholder="Örn: 2025 İstanbul Şampiyonası"
                                />
                            </div>
                            <div />
                        </div>
                    </section>
                )}

                {/* 2) Format */}
                {adimlar[adim] === 'Format' && (
                    <section className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="block text-sm mb-1">Turnuva tipi</label>
                            <select
                                className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                value={format}
                                onChange={(e) => setFormat(e.target.value as Format)}
                            >
                                <option value="single">Single Elimination</option>
                                <option value="double">Double Elimination</option>
                                <option value="group">Group Stage</option>
                                <option value="round_robin">Round Robin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Katılımcı sayısı</label>
                            <input
                                type="number"
                                min={2}
                                max={256}
                                className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                value={katilimci}
                                onChange={(e) => setKatilimci(Math.max(2, Number(e.target.value) || 2))}
                            />
                        </div>
                    </section>
                )}

                {/* 3) Organizasyon (ANA) */}
                {mode === 'main' && adimlar[adim] === 'Organizasyon' && (
                    <section className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Sahip</label>
                                <select
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={sahipId ?? ''}
                                    onChange={(e) => setSahipId(Number(e.target.value) || '')}
                                >
                                    <option value="">Seçiniz…</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm mb-2">Düzenleyiciler</label>
                            <EditorSecici users={users} secilenler={editorIds} setSecilenler={setEditorIds} />
                        </div>

                        <p className="text-[11px] text-gray-400 -mt-2">
                            Not: Sahip/Düzenleyici bilgileri şu an backend’e gönderilmiyor; şema hazır olduğunda eklenecek.
                        </p>
                    </section>
                )}

                {/* 3) Kategori Bilgileri (ALT) */}
                {mode === 'sub' && adimlar[adim] === 'Kategori Bilgileri' && (
                    <section className="grid gap-6">
                        {/* Tournament (Parent) */}
                        <div>
                            <label className="block text-sm mb-1">Turnuva</label>
                            {defaultParentId ? (
                                <input
                                    disabled
                                    className="w-full bg-[#1f2229] border border-transparent rounded px-3 py-2 text-gray-300"
                                    value={
                                        anaTurnuvalar.find((p) => p.id === defaultParentId)?.title ??
                                        `ID: ${defaultParentId}`
                                    }
                                />
                            ) : (
                                <select
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={parentId}
                                    onChange={(e) => setParentId(Number(e.target.value))}
                                >
                                    <option value="">Seçiniz…</option>
                                    {anaTurnuvalar.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Age */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Age min</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={yasMin ?? ''}
                                    onChange={(e) => setYasMin(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="örn. 12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Age max</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={yasMax ?? ''}
                                    onChange={(e) => setYasMax(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="örn. 16"
                                />
                            </div>
                        </div>

                        {/* Weight */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Weight min</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={kiloMin ?? ''}
                                    onChange={(e) => setKiloMin(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="örn. 40"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Weight max</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={kiloMax ?? ''}
                                    onChange={(e) => setKiloMax(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="örn. 65"
                                />
                            </div>
                        </div>

                        {/* Gender & Public */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm mb-1">Gender</label>
                                <select
                                    className="w-full bg-[#1f2229] border border-transparent focus:border-sky-500 rounded px-3 py-2"
                                    value={cinsiyet}
                                    onChange={(e) => setCinsiyet(e.target.value as typeof cinsiyet)}
                                >
                                    <option value="">Seçiniz…</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                />
                                Public
                            </label>
                        </div>

                        {/* İpucu */}
                        {(yasMin !== '' && yasMax !== '' && Number(yasMin) > Number(yasMax)) && (
                            <p className="text-amber-400 text-sm">
                                Uyarı: <b>Age min</b>, <b>Age max</b>’ten büyük olamaz.
                            </p>
                        )}
                        {(kiloMin !== '' && kiloMax !== '' && Number(kiloMin) > Number(kiloMax)) && (
                            <p className="text-amber-400 text-sm">
                                Uyarı: <b>Weight min</b>, <b>Weight max</b>’ten büyük olamaz.
                            </p>
                        )}
                    </section>
                )}

                {/* 4) Özet */}
                {adimlar[adim] === 'Özet' && (
                    <section className="grid gap-4">
                        <div className="bg-[#23252b] rounded p-4 grid gap-2 text-sm">
                            <div><b>Başlık:</b> {baslik || '-'}</div>
                            <div><b>Tip:</b> {format}</div>
                            <div><b>Katılımcı:</b> {katilimci}</div>
                            <div><b>Kategori:</b> {mode === 'main' ? 'Ana' : 'Alt'}</div>
                            {mode === 'sub' && (
                                <>
                                    <div>
                                        <b>Turnuva:</b>{' '}
                                        {defaultParentId
                                            ? anaTurnuvalar.find((p) => p.id === defaultParentId)?.title ?? `(ID: ${defaultParentId})`
                                            : anaTurnuvalar.find((p) => p.id === parentId)?.title ?? '-'}
                                    </div>
                                    <div><b>Age:</b> {(yasMin || '-')} – {(yasMax || '-')}</div>
                                    <div><b>Weight:</b> {(kiloMin || '-')} – {(kiloMax || '-')}</div>
                                    <div><b>Gender:</b> {cinsiyet || '-'}</div>
                                    <div><b>Public:</b> {isPublic ? 'Yes' : 'No'}</div>
                                </>
                            )}
                        </div>

                        {mode === 'main' && (
                            <div className="bg-[#23252b] rounded p-4 grid gap-2 text-sm">
                                <div className="font-semibold">Organizasyon</div>
                                <div><b>Sahip:</b> {users.find((u) => u.id === sahipId)?.username ?? '-'}</div>
                                <div>
                                    <b>Düzenleyiciler:</b>{' '}
                                    {editorIds.length
                                        ? editorIds.map((id) => users.find((u) => u.id === id)?.username ?? id).join(', ')
                                        : '-'}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2">
                                    Not: Bu alanlar şu an yalnızca arayüzde tutuluyor; backend hazır olduğunda kayda eklenecek.
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* Navigasyon */}
                <footer className="flex justify-between pt-2">
                    <button
                        className="px-3 py-2 rounded bg-[#3a3f49] hover:bg-[#444956] disabled:opacity-50"
                        onClick={() => setAdim((s) => Math.max(0, s - 1))}
                        disabled={adim === 0}
                    >
                        Geri
                    </button>

                    {adim < adimlar.length - 1 ? (
                        <button
                            className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
                            disabled={!ileriAktifMi()}
                            onClick={() => setAdim((s) => Math.min(adimlar.length - 1, s + 1))}
                        >
                            İleri
                        </button>
                    ) : (
                        <button
                            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
                            onClick={kaydet}
                        >
                            Oluştur
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
