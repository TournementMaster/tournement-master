import { useState, type FormEvent } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import ClubSelect from './ClubSelect'

export default function ParticipantsPanel() {
    const { players, setPlayers } = usePlayers()

    const [inputName, setInputName] = useState('')
    const [club, setClub] = useState('') // boş = kulüp yok

    const handleAdd = (e: FormEvent) => {
        e.preventDefault()
        const name = inputName.trim()
        if (!name) return
        const nextSeed = players.length + 1
        setPlayers([...players, { name, club: club || undefined, seed: nextSeed }])
        setInputName('')
    }

    const removeAt = (idx: number) => {
        const rest = players.filter((_, i) => i !== idx)
        const reseeded = rest.map((p, i) => ({ ...p, seed: i + 1 }))
        setPlayers(reseeded)
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Katılımcılar</h3>

            <form onSubmit={handleAdd} className="flex flex-col gap-2">
                <input
                    className="w-full bg-[#111318] rounded px-3 py-2"
                    value={inputName}
                    onChange={e => setInputName(e.target.value)}
                    placeholder="Sporcu adı girin…"
                />
                <ClubSelect selected={club} onChange={setClub} />
                <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                >
                    Ekle
                </button>
            </form>

            <div className="space-y-1 max-h-[calc(100vh-260px)] overflow-auto pr-1">
                {players.map((p, i) => (
                    <div key={`${p.name}-${p.seed}`} className="flex justify-between bg-[#14161c] px-3 py-1.5 rounded">
            <span className="team-text">
              #{p.seed} — {p.name} {p.club ? <em className="text-gray-400">· {p.club}</em> : null}
            </span>
                        <button
                            onClick={() => removeAt(i)}
                            className="text-red-400 hover:text-red-200"
                            aria-label={`${p.name} sil`}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                {players.length === 0 && (
                    <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>
                )}
            </div>
        </div>
    )
}
