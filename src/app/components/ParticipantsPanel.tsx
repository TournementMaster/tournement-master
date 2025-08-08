// src/app/components/ParticipantsPanel.tsx
import  { useState, type FormEvent } from 'react'
import { usePlayers } from '../hooks/usePlayers'

// Helper: array’i Fisher–Yates ile karıştır
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// Helper: en küçük 2^n ≥ x
function nextPowerOfTwo(x: number): number {
    return 2 ** Math.ceil(Math.log2(Math.max(1, x)))
}

export default function ParticipantsPanel() {
    const { setPlayers } = usePlayers()

    // Lokalde eklenen isimler
    const [inputName, setInputName] = useState('')
    const [list, setList] = useState<string[]>([])

    // Kulüp seçimi (varsa)
    const [club, setClub] = useState('')

    // Formda “Ekle” butonuna bastığımızda listeye ekle
    const handleAdd = (e: FormEvent) => {
        e.preventDefault()
        const name = inputName.trim()
        if (!name) return
        setList(prev => [...prev, name])
        setInputName('')
    }

    // “Kaydet”e basılınca listeyi shuffle edip setPlayers’e yolla
    const handleSave = () => {
        // 1) Rastgele sırala
        const shuffled = shuffle(list)
        // 2) Kaç slot lazım?
        const slotCount = nextPowerOfTwo(shuffled.length)
        // 3) Eksik varsa soru işareti (“bye”) ile doldur
        const filled = [
            ...shuffled,
            ...Array(slotCount - shuffled.length).fill('?'),
        ]
        // 4) Context’e yolla
        setPlayers(filled)
        // İstersen burada bir toast veya alert göster
        alert(`Bracket için ${shuffled.length} oyuncu kaydedildi (${slotCount} slot).`)
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    className="flex-1 bg-[#1f2229] rounded px-3 py-2"
                    value={inputName}
                    onChange={e => setInputName(e.target.value)}
                    placeholder="Sporcu adı girin…"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                >
                    Ekle
                </button>
            </form>

            <div className="space-y-1 max-h-36 overflow-auto">
                {list.map((n, i) => (
                    <div key={i} className="flex justify-between bg-[#23252b] px-3 py-1 rounded">
                        <span>{n}</span>
                        <button
                            onClick={() => setList(l => l.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-200"
                        >
                            ✕
                        </button>
                    </div>
                ))}
                {list.length === 0 && (
                    <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>
                )}
            </div>

            {/* Kulüp bölümü */}
            <div>
                <label className="block mb-1">Kulüp</label>
                {/* Mevcut ClubSelect’i buraya yerleştirebilirsin */}
                <input
                    className="w-full bg-[#1f2229] rounded px-3 py-2"
                    value={club}
                    onChange={e => setClub(e.target.value)}
                    placeholder="Kulüp adı seçin veya yazın…"
                />
            </div>

            {/* KAYDET butonu */}
            <button
                onClick={handleSave}
                disabled={list.length === 0}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white disabled:opacity-50"
            >
                Kaydet ve Şablona Uygula
            </button>
        </div>
    )
}
