import { useEffect, useState, type FormEvent } from 'react';
import { usePlayers } from '../hooks/usePlayers';
import ClubSelect from './ClubSelect';

export default function ParticipantsPanel() {
    const { players, setPlayers } = usePlayers();

    // View kilidi (mode === 'view' veya turnuva başladıysa)
    const [viewOnly, setViewOnly] = useState<boolean>(() => {
        const v = localStorage.getItem('bracket.viewOnly');
        return v ? JSON.parse(v) : false;
    });
    useEffect(() => {
        const h = (e: any) => {
            const v = Boolean(e.detail?.value);
            setViewOnly(v);
            localStorage.setItem('bracket.viewOnly', JSON.stringify(v));
        };
        window.addEventListener('bracket:view-only', h);
        return () => window.removeEventListener('bracket:view-only', h);
    }, []);
    const [locked, setLocked] = useState(false);
    useEffect(() => {
        const h = (e: any) => setLocked(Boolean(e.detail?.value));
        window.addEventListener('bracket:players-locked', h);
        return () => window.removeEventListener('bracket:players-locked', h);
    }, []);
    const readOnly = viewOnly || locked;

    // form state
    const [inputName, setInputName] = useState('');
    const [club, setClub] = useState('');

    const onAdd = (e: FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        const name = inputName.trim();
        if (!name) return;
        setPlayers([...players, { name, club: club || undefined, seed: players.length + 1 }]);
        setInputName('');
    };

    const removeAt = (idx: number) => {
        if (readOnly) return;
        const rest = players.filter((_, i) => i !== idx);
        const reseeded = rest.map((p, i) => ({ ...p, seed: i + 1 }));
        setPlayers(reseeded);
    };

    // 🔎 Arama (listenin ALTINDA durur, brakette highlight olayı gönderir)
    const [q, setQ] = useState('');
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('bracket:highlight', { detail: { name: q } }));
    }, [q]);

    const shown = q.trim()
        ? players.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
        : players;

    return (
        // ✅ Tam boy kolon; içindeki liste bölümü kendi içinde scroll olur
        <div className="flex flex-col h-full">
            <h3 className="font-semibold mb-2">Katılımcılar</h3>

            {/* Ekleme formu */}
            <form onSubmit={onAdd} className="flex flex-col gap-2">
                <input
                    className="w-full bg-[#111318] rounded px-3 py-2"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                    placeholder="Sporcu adı girin…"
                />

                {readOnly ? (
                    <input
                        className="w-full bg-[#111318] rounded px-3 py-2 text-white/80"
                        value={club}
                        readOnly
                        disabled
                        placeholder="Kulüp (görüntüleme)"
                    />
                ) : (
                    <ClubSelect selected={club} onChange={setClub} />
                )}

                {!readOnly && (
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white">
                        Ekle
                    </button>
                )}

                {readOnly && (
                    <div className="text-xs text-white/50">
                        {locked ? 'Turnuva başladı: katılımcı listesi kilitli.' : 'View modunda düzenleme yapılamaz.'}
                    </div>
                )}
            </form>

            {/* ✅ LİSTE — sadece bu alan scroll olur (max 8 satır görünür) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 mt-3 max-h-[calc(8*2.5rem+7*0.25rem)]">
                {shown.map((p, i) => (
                    <div
                        key={`${p.name}-${p.seed}`}
                        className="flex h-10 items-center justify-between bg-[#14161c] px-3 rounded"
                    >
      <span className="team-text">
        #{p.seed} — {p.name}
          {p.club ? <em className="text-gray-400"> · {p.club}</em> : null}
      </span>
                        {!readOnly && (
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
                {players.length === 0 && <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>}
                {players.length > 0 && shown.length === 0 && <p className="text-sm text-gray-500">Eşleşen sporcu yok.</p>}
            </div>

            {/* ✅ ARAMA — listenin ALTINDA */}
            <div className="pt-3 mt-3 border-t border-white/10">
                <input
                    className="w-full bg-[#111318] rounded px-3 py-2"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="(Sporcu ara...)"
                />
            </div>
        </div>
    );
}
