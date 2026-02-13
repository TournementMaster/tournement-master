import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { SubTournament } from '../hooks/useSubTournaments'

/** Düzgün hizalanan iOS-benzeri anahtar */
function Switch({
                    checked,
                    onChange,
                    label,
                    disabled = false,
                }: {
    checked: boolean
    onChange: (v: boolean) => void
    label?: string
    disabled?: boolean
}) {
    return (
        <div className="flex items-center gap-3 opacity-100">
            {label && <span className="select-none">{label}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={[
                    'relative inline-flex items-center',
                    'h-8 w-14 rounded-full transition-colors duration-200',
                    disabled
                        ? 'bg-gray-600/50 cursor-not-allowed'
                        : checked
                            ? 'bg-emerald-500'
                            : 'bg-gray-500/70',
                    'border',
                    checked ? 'border-emerald-600' : 'border-gray-600',
                    'shadow-inner',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-300/60',
                ].join(' ')}
            >
                <span
                    className={[
                        'translate-x-0',
                        'inline-block h-6 w-6 rounded-full bg-white',
                        'shadow-[0_1px_2px_rgba(0,0,0,.25)]',
                        'border border-gray-200',
                        'transform transition-transform duration-200 will-change-transform',
                        checked ? 'translate-x-6' : 'translate-x-1',
                    ].join(' ')}
                />
            </button>
        </div>
    )
}

export default function SubTournamentSettingsPanel() {
    const location = useLocation()
    const nav = useNavigate()
    const qc = useQueryClient()

    // --- VIEW/EDIT kilidi ---
    const [viewOnly, setViewOnly] = useState<boolean>(() => {
        // sekmeler arasında gidip gelince kilit durumu kaçmasın
        const v = localStorage.getItem('bracket.viewOnly')
        return v ? JSON.parse(v) : false
    })
    useEffect(() => {
        const h = (e: any) => {
            const v = Boolean(e.detail?.value)
            setViewOnly(v)
            localStorage.setItem('bracket.viewOnly', JSON.stringify(v))
        }
        window.addEventListener('bracket:view-only', h)
        return () => window.removeEventListener('bracket:view-only', h)
    }, [])

    // /bracket/{slug} → slug
    const slug = useMemo(() => {
        const m = location.pathname.match(/^\/bracket\/(.+)/)
        return m?.[1]
    }, [location.pathname])

    // Link state ile gelen varsa kullan
    const stateItem = location.state as SubTournament | undefined

    const [detail, setDetail] = useState<SubTournament | null>(stateItem ?? null)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    // Form alanları
    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('')
    const [ageMin, setAgeMin] = useState<string>('')
    const [ageMax, setAgeMax] = useState<string>('')
    const [wMin, setWMin] = useState<string>('')
    const [wMax, setWMax] = useState<string>('')
    const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
    const [isPublic, setIsPublic] = useState<boolean>(true)

    // Detay yoksa slug ile getir
    useEffect(() => {
        if (detail || !slug) return
            ;(async () => {
            try {
                setErr(null)
                const { data } = await api.get<SubTournament>(`subtournaments/${slug}/`)
                setDetail(data)
            } catch {
                setErr('Alt turnuva bilgisi alınamadı.')
            }
        })()
    }, [detail, slug])

    // Detail/State geldiğinde formu doldur
    useEffect(() => {
        if (!detail) return
        setTitle(detail.title ?? '')
        setDesc(detail.description ?? '')
        setAgeMin(Number.isFinite(detail.age_min as never) ? String(detail.age_min) : '')
        setAgeMax(Number.isFinite(detail.age_max as never) ? String(detail.age_max) : '')
        setWMin((detail.weight_min ?? '').toString())
        setWMax((detail.weight_max ?? '').toString())
        setGender((detail.gender as never) || 'M')
        setIsPublic(detail.public)
    }, [detail])

    async function save() {
        if (viewOnly) return // güvenlik
        if (!detail?.public_slug) return
        setBusy(true)
        setErr(null)
        try {
            const payload = {
                title,
                description: desc,
                age_min: Number(ageMin) || 0,
                age_max: Number(ageMax) || 0,
                weight_min: wMin,
                weight_max: wMax,
                gender,
                public: isPublic,
            }
            await api.patch(`subtournaments/${encodeURIComponent(detail.public_slug)}/`, payload)
            await qc.invalidateQueries({ queryKey: ['subtournaments'] })
            await qc.invalidateQueries({ queryKey: ['subtournament', slug] })

            // Header başlığını URL’de güncelle (gender/weight de eklenebilir, ama Header API'den okuyor)
            const sp = new URLSearchParams(location.search)
            sp.set('title', title || '')
            nav({ pathname: location.pathname, search: sp.toString() }, { replace: true })
        } catch {
            setErr('Güncelleme başarısız. Lütfen tekrar deneyin.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Panel başlığı */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">Alt turnuva ayarları</h3>
            </div>

            {err && (
                <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
                    {err}
                </div>
            )}
            {!slug && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 text-sm text-amber-200">
                    Slug okunamadı.
                </div>
            )}

            {/* İçerik – her zaman açık (Aç/Kapat kaldırıldı) */}
            <>
                <Labeled label="Başlık">
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 placeholder:text-white/35 focus:outline-none focus:border-premium-accent/55 transition-colors"
                        readOnly={viewOnly}
                        disabled={viewOnly}
                        placeholder={viewOnly ? 'View modunda düzenlenemez' : ''}
                    />
                </Labeled>

                <Labeled label="Açıklama">
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        className="w-full h-24 px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 placeholder:text-white/35 focus:outline-none focus:border-premium-accent/55 transition-colors"
                        readOnly={viewOnly}
                        disabled={viewOnly}
                        placeholder={viewOnly ? 'View modunda düzenlenemez' : ''}
                    />
                </Labeled>

                <div className="grid grid-cols-2 gap-3">
                    <Labeled label="Yaş Min">
                        <input
                            value={ageMin}
                            onChange={e => setAgeMin(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            inputMode="numeric"
                            className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 focus:outline-none focus:border-premium-accent/55 transition-colors"
                            readOnly={viewOnly}
                            disabled={viewOnly}
                        />
                    </Labeled>
                    <Labeled label="Yaş Max">
                        <input
                            value={ageMax}
                            onChange={e => setAgeMax(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            inputMode="numeric"
                            className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 focus:outline-none focus:border-premium-accent/55 transition-colors"
                            readOnly={viewOnly}
                            disabled={viewOnly}
                        />
                    </Labeled>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Labeled label="Kilo Min (kg)">
                        <input
                            value={wMin}
                            onChange={e => setWMin(e.target.value.replace(/[^\d.,-]/g, '').slice(0, 6))}
                            inputMode="decimal"
                            className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 focus:outline-none focus:border-premium-accent/55 transition-colors"
                            readOnly={viewOnly}
                            disabled={viewOnly}
                        />
                    </Labeled>
                    <Labeled label="Kilo Max (kg)">
                        <input
                            value={wMax}
                            onChange={e => setWMax(e.target.value.replace(/[^\d.,-]/g, '').slice(0, 6))}
                            inputMode="decimal"
                            className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 focus:outline-none focus:border-premium-accent/55 transition-colors"
                            readOnly={viewOnly}
                            disabled={viewOnly}
                        />
                    </Labeled>
                </div>

                <Labeled label="Cinsiyet">
                    <select
                        value={gender}
                        onChange={e => setGender(e.target.value as 'M' | 'F' | 'O')}
                        className="w-full px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 text-white/90 focus:outline-none focus:border-premium-accent/55 transition-colors"
                        disabled={viewOnly}
                    >
                        <option value="M">Erkek</option>
                        <option value="F">Kadın</option>
                        <option value="O">Karma</option>
                    </select>
                </Labeled>

                {/* Public anahtarı (aç/kapat) — istenildiği gibi direkt gösteriliyor */}
                <Switch checked={isPublic} onChange={setIsPublic} label="Public" disabled={viewOnly} />

                {/* Kaydet */}
                <div className="pt-2">
                    <button
                        onClick={save}
                        disabled={busy || !title.trim() || viewOnly}
                        className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-colors"
                    >
                        {busy ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                    {viewOnly && (
                        <div className="mt-2 text-xs text-white/50">View modunda düzenleme yapılamaz.</div>
                    )}
                </div>
            </>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block mb-1 text-xs font-semibold tracking-wide text-white/60">
                {label}
            </label>
            {children}
        </div>
    )
}
