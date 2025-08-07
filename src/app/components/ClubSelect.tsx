import { useState } from 'react'

interface ClubSelectProps {
    selected: string
    onChange: (club: string) => void
}

export default function ClubSelect({ selected, onChange }: ClubSelectProps) {
    const [clubs, setClubs]     = useState<string[]>(['Fenerbahçe', 'Galatasaray'])
    const [adding, setAdding]   = useState(false)
    const [text, setText]       = useState('')

    if (adding) {
        return (
            <div className="space-y-2">
                <label className="block mb-1">Kulüp</label>
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="rounded bg-[#1f2229] px-3 py-2 w-full"
                    placeholder="Yeni kulüp adı"
                />
                <div className="flex gap-2">
                    <button
                        className="flex-1 rounded bg-emerald-600 px-3 py-2"
                        onClick={() => {
                            if (text.trim()) {
                                setClubs(prev => [...prev, text.trim()])
                                onChange(text.trim())
                            }
                            setText('')
                        }}
                    >
                        Ekle
                    </button>
                    <button
                        className="flex-1 rounded bg-gray-600 px-3 py-2"
                        onClick={() => setAdding(false)}
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <label className="block mb-1">Kulüp</label>
            <select
                value={selected}
                onChange={e => onChange(e.target.value)}
                className="w-full rounded bg-[#1f2229] px-3 py-2"
            >
                <option value="">Seçiniz…</option>
                {clubs.map(c => (
                    <option key={c} value={c}>
                        {c}
                    </option>
                ))}
            </select>
            <button
                className="mt-2 text-sm text-blue-400 underline"
                onClick={() => setAdding(true)}
            >
                Kulüp ekle / sil
            </button>
        </div>
    )
}
