import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Club } from '../models/Club'
import ClubModal from './ClubModal'

interface ClubSelectProps {
    selected: string
    onChange: (club: string) => void
}

export default function ClubSelect({ selected, onChange }: ClubSelectProps) {
    const [clubs, setClubs]           = useState<Club[]>([])
    const [open, setOpen]             = useState(false)
    const [query, setQuery]           = useState(selected)
    const [showModal, setShowModal]   = useState(false)
    const [busy, setBusy]             = useState(false)
    const boxRef = useRef<HTMLDivElement>(null)

    // 1) Dış tıklama ile dropdown'u kapat
    useEffect(() => {
        function handleClick(e: Event) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // 2) ESC ile dropdown ve modal'ı kapat
    useEffect(() => {
        function handleKey(e: globalThis.KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false)
                setShowModal(false)
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    // 3) API'den kulüp listesi çek
    useEffect(() => {
        ;(async () => {
            try {
                const { data } = await api.get<Club[]>('clubs/')
                if (Array.isArray(data)) setClubs(data)
            } catch {
                // hata sessiz geçilsin
            }
        })()
    }, [])

    // 4) dışarıdan gelen selected değişince query'yi güncelle
    useEffect(() => {
        setQuery(selected)
    }, [selected])

    // 5) filtreleme
    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase()
        return term
            ? clubs.filter(c => c.name.toLowerCase().includes(term))
            : clubs
    }, [clubs, query])

    const noMatch = query.trim().length > 0 && filtered.length === 0

    // 6) yeni kulüp oluştur
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
        } finally {
            setBusy(false)
        }
    }

    // 7) mevcut kulübü sil
    const handleRemove = (club: Club) => {
        setClubs(prev => prev.filter(c => c.id !== club.id))
        if (selected === club.name) {
            onChange('')
            setQuery('')
        }
    }

    return (
        <div className="relative" ref={boxRef}>
            <label className="block mb-1 text-sm text-gray-200">Kulüp</label>
            <input
                type="text"
                value={query}
                placeholder="Arayın veya yazın…"
                onChange={e => {
                    setQuery(e.target.value)
                    onChange(e.target.value)
                }}
                onFocus={() => setOpen(true)}
                className="w-full rounded bg-[#1f2229] px-3 py-2 text-white"
            />

            {open && (
                <div className="absolute z-20 mt-1 w-full rounded bg-[#2d3038] border border-white/10 max-h-56 overflow-auto">
                    {!noMatch &&
                        filtered.map(c => (
                            <button
                                key={c.id}
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                                onClick={() => {
                                    onChange(c.name)
                                    setQuery(c.name)
                                    setOpen(false)
                                }}
                            >
                                {c.name}{' '}
                                <span className="text-xs text-gray-400">· {c.city}</span>
                            </button>
                        ))}

                    {noMatch && (
                        <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                            onClick={() => {
                                setShowModal(true)
                                setOpen(false)
                            }}
                        >
                            + Yeni kulüp oluştur: <b>{query.trim()}</b>
                        </button>
                    )}
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
