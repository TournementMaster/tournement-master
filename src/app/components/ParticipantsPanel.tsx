// src/app/components/ParticipantsPanel.tsx
import { useState } from 'react'
import { usePlayers } from '../context/BracketPlayersCtx'
import ClubSelect from './ClubSelect'

export default function ParticipantsPanel() {
    const { players, setPlayers } = usePlayers()
    const [name, setName]   = useState('')
    const [club, setClub]   = useState('')

    const addParticipant = () => {
        if (!name.trim() || !club) return
        setPlayers([...players, `${name.trim()} (${club})`])
        setName('')
        setClub('')
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold mb-2">Katılımcı Ekle</h3>

            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Sporcu Adı"
                className="w-full px-3 py-2 bg-[#1f2229] rounded"
            />

            <ClubSelect selected={club} onChange={setClub} />

            <button
                onClick={addParticipant}
                className="w-full bg-teal-400 hover:bg-green-300 text-black py-2 rounded"
            >
                OK
            </button>

            {players.length > 0 && (
                <ul className="mt-4 space-y-1">
                    {players.map((p, i) => (
                        <li key={i} className="px-3 py-2 bg-[#23252b] rounded">
                            {p}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
