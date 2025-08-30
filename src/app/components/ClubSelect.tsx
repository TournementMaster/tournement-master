import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Club } from '../models/Club'
import ClubModal from './ClubModal'

interface ClubSelectProps {
    selected: string // '' = yok
    onChange: (club: string) => void
}

export default function ClubSelect({ selected, onChange }: ClubSelectProps) {
    const [clubs, setClubs] = useState<Club[]>([])
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('') // 'Yok' yerine boş
    const [showModal, setShowModal] = useState(false)
    const [busy, setBusy] = useState(false)
    const boxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: Event) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    useEffect(() => {
        function handleKey(e: globalThis.KeyboardEvent) {
            if (e.key === 'Escape') { setOpen(false); setShowModal(false) }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    useEffect(() => {
        ;(async () => {
            try {
                const { data } = await api.get<Club[]>('clubs/')
                if (Array.isArray(data)) setClubs(data)
            } catch {}
        })()
    }, [])

    // Dışarıdan seçilen değer değişirse input'u eşitle ('' ise boş kalsın)
    useEffect(() => setQuery(selected), [selected])

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase()
        const base = clubs
        return term ? base.filter(c => c.name.toLowerCase().includes(term)) : base
    }, [clubs, query])

    const handleCreate = async (name: string, city: string) => {
        setBusy(true)
        try {
            const { data } = await api.post<Club>('clubs/', { name, city })
            setClubs(prev => {
                // aynı isimle 200 döndüyse listede olabilir; duplicate’ı önle
                const exists = prev.some(x => x.id === data.id)
                return exists ? prev : [data, ...prev]
            })
            onChange(data.name)
            setQuery(data.name)
            setShowModal(false)
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Kulüp oluşturulamadı.'
            alert(msg)
        } finally { setBusy(false) }
    }

    const handleRemove = async (club: Club) => {
        try {
            await api.delete(`clubs/${club.id}/`)
            setClubs(prev => prev.filter(c => c.id !== club.id))
            // seçili kulüp silindiyse seçimi temizle
            if (selected === club.name) { onChange(''); setQuery('') }
            // Not: Athlete.club FK'si SET_NULL olduğundan sporcular silinmez (BE modeli)
        } catch (err: any) {
            const status = err?.response?.status
            if (status === 403) alert('Bu kulübü silme yetkiniz yok.')
            else alert('Kulüp silinemedi.')
        }
    }

    const handleUpdate = async (club: Club, patch: { name: string; city: string }) => {
        try {
            const { data } = await api.patch<Club>(`clubs/${club.id}/`, patch)
            setClubs(prev => prev.map(c => (c.id === club.id ? data : c)))
            // eğer bu kulüp seçiliyse ve ismi değiştiyse seçimi güncelle
            if (selected === club.name && data?.name && data.name !== club.name) {
                onChange(data.name)
                setQuery(data.name)
                // İstersen global bir event ile yan paneldeki liste/oyunculara duyurabilirsin:
                // window.dispatchEvent(new CustomEvent('club:renamed', { detail: { from: club.name, to: data.name } }))
            }
        } catch (err: any) {
            const status = err?.response?.status
            if (status === 400 || status === 409) {
                alert('Bu isimde bir kulüp zaten var.')
            } else if (status === 403) {
                alert('Bu kulübü düzenleme yetkiniz yok.')
            } else {
                alert('Kulüp güncellenemedi.')
            }
        }
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
                        onClick={() => { onChange(''); setQuery(''); setOpen(false) }}
                    >
                        (Kulüp yok)
                    </button>

                    {filtered.map(c => (
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
                        + Kulüp oluştur ve Düzenle
                    </button>
                </div>
            )}

            {showModal && (
                <ClubModal
                    existing={clubs}
                    busy={busy}
                    onCreate={handleCreate}
                    onRemove={handleRemove}      // ← DELETE çağrısı burada
                    onUpdate={handleUpdate}      // ← PATCH çağrısı burada
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}