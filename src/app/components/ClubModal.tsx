// src/app/components/ClubModal.tsx
import { useState } from 'react'
import type { Club } from '../models/Club'

interface ClubModalProps {
    existing: Club[]
    busy: boolean
    onCreate: (name: string, city: string) => Promise<void>
    onRemove: (club: Club) => Promise<void>         // ← Promise döndürsün
    onUpdate: (club: Club, patch: { name: string; city: string }) => Promise<void> // ← eklendi
    onClose: () => void
}

export default function ClubModal({
                                      existing,
                                      busy,
                                      onCreate,
                                      onRemove,
                                      onUpdate,
                                      onClose,
                                  }: ClubModalProps) {
    const [name, setName] = useState('')
    const [city, setCity] = useState('')

    // inline edit state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editCity, setEditCity] = useState('')

    const startEdit = (c: Club) => {
        setEditingId(c.id)
        setEditName(c.name)
        setEditCity(c.city || '')
    }
    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditCity('')
    }
    const saveEdit = async (c: Club) => {
        const newName = editName.trim()
        const newCity = editCity.trim()
        if (!newName) return
        await onUpdate(c, { name: newName, city: newCity })
        cancelEdit()
    }

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
                        <ul className="max-h-52 overflow-auto space-y-2">
                            {existing.map(c => {
                                const isEditing = editingId === c.id
                                return (
                                    <li
                                        key={c.id}
                                        className="flex flex-col gap-2 bg-[#1f2229] px-4 py-3 rounded"
                                    >
                                        {!isEditing ? (
                                            <div className="flex items-center justify-between">
                        <span>
                          {c.name}{' '}
                            <em className="text-gray-400">· {c.city || '—'}</em>
                        </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="text-sm px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                                                        onClick={() => startEdit(c)}
                                                    >
                                                        Düzenle
                                                    </button>
                                                    <button
                                                        className="text-red-500 hover:text-red-400 text-xl"
                                                        onClick={async () => {
                                                            if (!confirm(`"${c.name}" kulübünü silmek istiyor musunuz?`)) return
                                                            await onRemove(c)
                                                        }}
                                                        title="Sil"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 rounded bg-[#111318] px-3 py-2"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        placeholder="Kulüp adı"
                                                    />
                                                    <input
                                                        className="flex-1 rounded bg-[#111318] px-3 py-2"
                                                        value={editCity}
                                                        onChange={e => setEditCity(e.target.value)}
                                                        placeholder="Şehir"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                                                        onClick={cancelEdit}
                                                    >
                                                        İptal
                                                    </button>
                                                    <button
                                                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                                                        disabled={!editName.trim()}
                                                        onClick={() => saveEdit(c)}
                                                    >
                                                        Kaydet
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                )}
            </div>
        </div>
    )
}
