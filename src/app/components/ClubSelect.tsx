// src/app/components/ClubSelect.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'

interface Club {
    id: number
    name: string
    city: string
    created_at: string
    owner: number
}

interface ClubSelectProps {
    selected: string
    onChange: (club: string) => void
}

export default function ClubSelect({ selected, onChange }: ClubSelectProps) {
    const [clubs, setClubs] = useState<Club[]>([])
    const [open, setOpen]   = useState(false)
    const [q, setQ]         = useState<string>(selected ?? '')
    const [showCreate, setShowCreate] = useState(false)
    const [cName, setCName] = useState('')
    const [cCity, setCCity] = useState('')
    const [busy, setBusy]   = useState(false)
    const boxRef = useRef<HTMLDivElement>(null)

    // Dışarı tıklayınca kapanma
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // Kulüpleri getir
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get<Club[]>('clubs/')
                if (Array.isArray(data)) setClubs(data)
            } catch {
                // sessiz geç
            }
        })()
    }, [])

    useEffect(() => setQ(selected), [selected])

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase()
        return term ? clubs.filter(c => c.name.toLowerCase().includes(term)) : clubs
    }, [clubs, q])

    const noMatch = q.trim().length > 0 && filtered.length === 0

    async function createClub() {
        const name = cName.trim()
        const city = cCity.trim()
        if (!name || !city) return
        setBusy(true)
        try {
            const { data } = await api.post<Club>('clubs/', { name, city })
            setClubs(prev => [data, ...prev])
            onChange(data.name)
            setQ(data.name)
            setShowCreate(false)
            setCName('')
            setCCity('')
        } catch {
            // basit hata yönetimi
            alert('Takım oluşturulamadı.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="relative" ref={boxRef}>
            <label className="block mb-1">Kulüp</label>
            <input
                value={q}
                onChange={e => { setQ(e.target.value); onChange(e.target.value) }}
                onFocus={() => setOpen(true)}
                className="w-full rounded bg-[#1f2229] px-3 py-2"
                placeholder="Kulüp adı yazın…"
            />

            {open && (
                <div className="absolute z-20 mt-1 w-full rounded bg-[#2d3038] border border-white/10 max-h-56 overflow-auto">
                    {!noMatch && filtered.map(c => (
                        <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700"
                            onClick={() => { onChange(c.name); setQ(c.name); setOpen(false) }}
                        >
                            {c.name} <span className="text-xs text-gray-400">· {c.city}</span>
                        </button>
                    ))}

                    {noMatch && (
                        <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-700"
                            onClick={() => {
                                setCName(q.trim())
                                setCCity('')
                                setShowCreate(true)
                                setOpen(false)
                            }}
                        >
                            Yeni takım oluştur: <b>{q.trim()}</b>
                        </button>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreate(false)} />
                    <div className="relative z-10 w-[min(92vw,28rem)] bg-[#2d3038] rounded-xl p-5 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Yeni Takım</h3>
                            <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded hover:bg-white/10">✕</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 text-sm">Takım adı</label>
                                <input value={cName} onChange={e => setCName(e.target.value)} className="w-full rounded bg-[#1f2229] px-3 py-2" />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm">Şehir</label>
                                <input value={cCity} onChange={e => setCCity(e.target.value)} className="w-full rounded bg-[#1f2229] px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700">Vazgeç</button>
                                <button
                                    disabled={busy || !cName.trim() || !cCity.trim()}
                                    onClick={createClub}
                                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Oluştur
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
