import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Club } from '../models/Club'
import ClubModal from './ClubModal'

interface ClubSelectProps {
    selected: string
    onChange: (club: string) => void
}

/** Siyah temaya uygun, "Yok" seçeneği olan dropdown + yeni kulüp oluşturma modalı */
export default function ClubSelect({ selected, onChange }: ClubSelectProps) {
    const [clubs, setClubs]         = useState<Club[]>([])
    const [open, setOpen]           = useState(false)
    const [query, setQuery]         = useState(selected || 'Yok')
    const [showModal, setShowModal] = useState(false)
    const [busy, setBusy]           = useState(false)
    const boxRef = useRef<HTMLDivElement>(null)

    // Dış tıklama
    useEffect(() => {
        function handleClick(e: Event) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // ESC
    useEffect(() => {
        function handleKey(e: globalThis.KeyboardEvent) {
            if (e.key === 'Escape') { setOpen(false); setShowModal(false) }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    // API
    useEffect(() => {
        ;(async () => {
            try {
                const { data } = await api.get<Club[]>('clubs/')
                if (Array.isArray(data)) setClubs(data)
            } catch {}
        })()
    }, [])

    useEffect(() => setQuery(selected || 'Yok'), [selected])

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase()
        const base = clubs
        return term ? base.filter(c => c.name.toLowerCase().includes(term)) : base
    }, [clubs, query])

    const noMatch = query.trim().length > 0 && filtered.length === 0

    const handleCreate = async (name: string, city: string) => {
        setBusy(true)
        try {
            const { data } = await api.post<Club>('clubs/', { name, city })
            setClubs(prev => [data, ...prev])
            onChange(data.name)
            setQuery(data.name)
            setShowModal(false)
        } catch {
            alert('Kulüp oluşturulamadı.')
        } finally { setBusy(false) }
    }

    const handleRemove = (club: Club) => {
        setClubs(prev => prev.filter(c => c.id !== club.id))
        if (selected === club.name) { onChange('Yok'); setQuery('Yok') }
    }

    return (
        <div className="relative" ref={boxRef}>
            <label className="block mb-1 text-sm text-gray-200">Kulüp</label>

            <input
                type="text"
                value={query}
                placeholder="Kulüp ara veya yaz…"
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setOpen(true)}
                className="w-full rounded bg-[#111318] px-3 py-2 text-white"
            />

            {open && (
                <div className="absolute z-20 mt-1 w-full rounded bg-[#0b0b0b] border border-white/10 max-h-56 overflow-auto shadow-xl">
                    <button
                        className="w-full text-left px-3 py-2 hover:bg-emerald-900/30 text-white"
                        onClick={() => { onChange('Yok'); setQuery('Yok'); setOpen(false) }}
                    >
                        Yok
                    </button>

                    {!noMatch && filtered.map(c => (
                        <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-900/30 text-white"
                            onClick={() => { onChange(c.name); setQuery(c.name); setOpen(false) }}
                        >
                            {c.name} <span className="text-xs text-gray-400">· {c.city}</span>
                        </button>
                    ))}

                    <button
                        className="w-full text-left px-3 py-2 hover:bg-emerald-900/30 text-emerald-300"
                        onClick={() => { setShowModal(true); setOpen(false) }}
                    >
                        + Yeni kulüp oluştur…
                    </button>
                </div>
            )}

            {showModal && (
                <ClubModal
                    existing={clubs}
                    busy={busy}
                    onCreate={handleCreate}
                    onRemove={handleRemove}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
