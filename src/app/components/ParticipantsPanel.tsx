import { useEffect, useState, type FormEvent } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import ClubSelect from './ClubSelect'

export default function ParticipantsPanel() {
    const { setPlayers } = usePlayers()

    const [inputName, setInputName] = useState('')
    const [list, setList]           = useState<string[]>([])
    const [club, setClub]           = useState('Yok') // varsayılan

    // Liste değiştikçe şablona uygula
    useEffect(() => {
        setPlayers(list)
    }, [list, setPlayers])

    const handleAdd = (e: FormEvent) => {
        e.preventDefault()
        const name = inputName.trim()
        if (!name) return
        if (!club) {
            alert('Lütfen kulüp seçin veya "Yok" seçeneğini belirleyin.')
            return
        }
        setList(prev => [...prev, name])
        setInputName('')
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
                {list.map((n, i) => (
                    <div key={`${n}-${i}`} className="flex justify-between bg-[#14161c] px-3 py-1.5 rounded">
                        <span className="team-text">{n}</span>
                        <button
                            onClick={() => setList(l => l.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-200"
                            aria-label={`${n} sil`}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                {list.length === 0 && (
                    <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>
                )}
            </div>
        </div>
    )
}
