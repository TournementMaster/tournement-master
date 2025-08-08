import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { SubTournament } from '../hooks/useSubTournaments'

export default function SubTournamentSettingsPanel() {
    const location = useLocation()
    const nav = useNavigate()
    const qc = useQueryClient()

    // /bracket/{slug} → slug çıkar
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
        if (!detail?.id) return
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
            await api.patch(`subtournaments/${detail.id}/`, payload)
            await qc.invalidateQueries({ queryKey: ['subtournaments'] })
            await qc.invalidateQueries({ queryKey: ['subtournament', slug] })

            const sp = new URLSearchParams(location.search)
            sp.set('title', title || '')
            nav({ pathname: location.pathname, search: sp.toString() }, { replace: true })
            alert('Ayarlar güncellendi.')
        } catch {
            setErr('Güncelleme başarısız. Lütfen tekrar deneyin.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-4 text-sm">
            <h3 className="font-semibold mb-1">Alt Turnuva Ayarları</h3>
            {err && <div className="text-sm text-red-300">{err}</div>}
            {!slug && <div className="text-sm text-amber-300">Slug okunamadı.</div>}

            <Labeled label="Başlık">
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#111318]"
                />
            </Labeled>

            <Labeled label="Açıklama">
        <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full h-24 px-3 py-2 rounded bg-[#111318]"
        />
            </Labeled>

            <div className="grid grid-cols-2 gap-3">
                <Labeled label="Yaş Min">
                    <input
                        value={ageMin}
                        onChange={e => setAgeMin(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        inputMode="numeric"
                        className="w-full px-3 py-2 rounded bg-[#111318]"
                    />
                </Labeled>
                <Labeled label="Yaş Max">
                    <input
                        value={ageMax}
                        onChange={e => setAgeMax(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        inputMode="numeric"
                        className="w-full px-3 py-2 rounded bg-[#111318]"
                    />
                </Labeled>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Labeled label="Kilo Min (kg)">
                    <input
                        value={wMin}
                        onChange={e => setWMin(e.target.value.replace(/[^\d.,-]/g, '').slice(0, 6))}
                        inputMode="decimal"
                        className="w-full px-3 py-2 rounded bg-[#111318]"
                    />
                </Labeled>
                <Labeled label="Kilo Max (kg)">
                    <input
                        value={wMax}
                        onChange={e => setWMax(e.target.value.replace(/[^\d.,-]/g, '').slice(0, 6))}
                        inputMode="decimal"
                        className="w-full px-3 py-2 rounded bg-[#111318]"
                    />
                </Labeled>
            </div>

            <Labeled label="Cinsiyet">
                <select
                    value={gender}
                    onChange={e => setGender(e.target.value as 'M' | 'F' | 'O')}
                    className="w-full px-3 py-2 rounded bg-[#111318]"
                >
                    <option value="M">Erkek</option>
                    <option value="F">Kadın</option>
                    <option value="O">Karma</option>
                </select>
            </Labeled>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="accent-emerald-400"
                />
                <span>Görünür (Public)</span>
            </label>

            <div className="pt-2">
                <button
                    onClick={save}
                    disabled={busy || !title.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded"
                >
                    {busy ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
            </div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block mb-1 text-sm">{label}</label>
            {children}
        </div>
    )
}
