import {useState, type FormEvent, useEffect} from 'react'
import { usePlayers } from '../hooks/usePlayers'
import ClubSelect from './ClubSelect'

export default function ParticipantsPanel() {
    const { players, setPlayers } = usePlayers()

    // ▼ View modunda kilitleme durumu
    const [viewOnly, setViewOnly] = useState<boolean>(() => {
        const v = localStorage.getItem('bracket.viewOnly')
        return v ? JSON.parse(v) : false
    })
    useEffect(() => {
        const h = (e: any) => {
            const v = Boolean(e.detail?.value)
            setViewOnly(v)
            localStorage.setItem('bracket.viewOnly', JSON.stringify(v))
        }
        window.addEventListener('bracket:view-only', h)
        return () => window.removeEventListener('bracket:view-only', h)
    }, [])

    const [inputName, setInputName] = useState('')
    const [club, setClub] = useState('') // boş = kulüp yok

    const handleAdd = (e: FormEvent) => {
        e.preventDefault()
        if (viewOnly) return // ▼ View modunda ekleme yok

        const name = inputName.trim()
        if (!name) return
        const nextSeed = players.length + 1
        setPlayers([...players, { name, club: club || undefined, seed: nextSeed }])
        setInputName('')
    }

    const removeAt = (idx: number) => {
        if (viewOnly) return // ▼ View modunda silme yok
        const rest = players.filter((_, i) => i !== idx)
        const reseeded = rest.map((p, i) => ({ ...p, seed: i + 1 }))
        setPlayers(reseeded)
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Katılımcılar</h3>

            {/* View modunda form alanlarını okunur metne çeviriyoruz */}
            <form onSubmit={handleAdd} className="flex flex-col gap-2">
                {/* İsim alanı */}
                <input
                    className="w-full bg-[#111318] rounded px-3 py-2"
                    value={inputName}
                    onChange={e => setInputName(e.target.value)}
                    readOnly={viewOnly}
                    disabled={viewOnly}
                    placeholder="Sporcu adı girin…"
                />

                {/* Kulüp alanı: viewOnly ise ClubSelect yerine salt-okunur input göster */}
                {viewOnly ? (
                    <input
                        className="w-full bg-[#111318] rounded px-3 py-2 text-white/80"
                        value={club}
                        readOnly
                        disabled
                        placeholder="Kulüp (yalnızca görüntüleme)"
                        aria-label="Kulüp (görüntüleme)"
                    />
                ) : (
                    <ClubSelect selected={club} onChange={setClub} />
                )}

                {/* Ekle butonu viewOnly’de görünmesin */}
                {!viewOnly && (
                    <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                    >
                        Ekle
                    </button>
                )}

                {/* View modunda küçük bir bilgi etiketi (opsiyonel) */}
                {viewOnly && (
                    <div className="text-xs text-white/50">
                        View modunda düzenleme yapılamaz.
                    </div>
                )}
            </form>

            {/* Liste */}
            <div className="space-y-1 max-h-[calc(100vh-260px)] overflow-auto pr-1">
                {players.map((p, i) => (
                    <div
                        key={`${p.name}-${p.seed}`}
                        className="flex justify-between bg-[#14161c] px-3 py-1.5 rounded"
                    >
            <span className="team-text">
              #{p.seed} — {p.name}{' '}
                {p.club ? <em className="text-gray-400">· {p.club}</em> : null}
            </span>

                        {/* Silme butonu viewOnly’de görünmesin */}
                        {!viewOnly && (
                            <button
                                onClick={() => removeAt(i)}
                                className="text-red-400 hover:text-red-200"
                                aria-label={`${p.name} sil`}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}

                {players.length === 0 && (
                    <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>
                )}
            </div>
        </div>
    )
}
