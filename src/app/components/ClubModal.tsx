import { useState } from 'react'
import type { Club } from '../models/Club'

interface ClubModalProps {
    existing: Club[]
    busy: boolean
    onCreate: (name: string, city: string) => Promise<void>
    onRemove: (club: Club) => void
    onClose: () => void
}

export default function ClubModal({
                                      existing,
                                      busy,
                                      onCreate,
                                      onRemove,
                                      onClose,
                                  }: ClubModalProps) {
    const [name, setName] = useState('')
    const [city, setCity] = useState('')

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <div className="relative z-10 w-[min(90vw,32rem)] bg-[#2d3038] rounded-xl p-8 text-white text-lg shadow-xl">
                <h2 className="text-2xl font-bold mb-4">Yeni Kulüp Oluştur</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block mb-1">Kulüp Adı</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded bg-[#1f2229] px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Şehir</label>
                        <input
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            className="w-full rounded bg-[#1f2229] px-3 py-2"
                        />
                    </div>

                    <button
                        disabled={busy || !name.trim() || !city.trim()}
                        onClick={() => onCreate(name.trim(), city.trim())}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded text-xl disabled:opacity-50"
                    >
                        Oluştur
                    </button>
                </div>

                {existing.length > 0 && (
                    <>
                        <h3 className="mt-8 mb-2 text-lg">Mevcut Kulüpler</h3>
                        <ul className="max-h-40 overflow-auto space-y-2">
                            {existing.map(c => (
                                <li key={c.id} className="flex justify-between items-center bg-[#1f2229] px-4 py-2 rounded">
                                    <span>{c.name} <em className="text-gray-400">· {c.city}</em></span>
                                    <button onClick={() => onRemove(c)} className="text-red-500 hover:text-red-400 text-xl">
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    )
}
