import { useEffect, useState, type FormEvent } from 'react';
import { usePlayers } from '../hooks/usePlayers';
import ClubSelect from './ClubSelect';

export default function ParticipantsPanel() {
    const { players, setPlayers } = usePlayers();

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

    const [q, setQ] = useState('');
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('bracket:highlight', { detail: { name: q } }));
    }, [q]);

    const shown = q.trim()
        ? players.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
        : players;

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Katılımcılar
            </h3>

            {/* Ekleme formu */}
            <form onSubmit={onAdd} className="flex flex-col gap-2">
                <input
                    className="w-full rounded-2xl px-4 py-2.5 bg-black/20 border border-white/10 text-white/90 placeholder:text-white/35 focus:outline-none focus:border-premium-accent/55 transition-colors"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                    placeholder="Sporcu adı girin…"
                />

                {readOnly ? (
                    <input
                        className="w-full rounded-2xl px-4 py-2.5 bg-black/20 border border-white/10 text-white/70 placeholder:text-white/30"
                        value={club}
                        readOnly
                        disabled
                        placeholder="Kulüp (görüntüleme)"
                    />
                ) : (
                    <ClubSelect selected={club} onChange={setClub} />
                )}

                {!readOnly && (
                    <button
                        type="submit"
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow transition-colors"
                    >
                        Ekle
                    </button>
                )}

                {readOnly && (
                    <div className="rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/10 text-xs text-white/60">
                        {locked
                            ? 'Turnuva başladı: katılımcı listesi kilitli.'
                            : 'View modunda düzenleme yapılamaz.'}
                    </div>
                )}
            </form>

            {/* LİSTE */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mt-4">
                {shown.map((p, i) => (
                    <div
                        key={`${p.name}-${p.seed}`}
                        className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-black/20 border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div className="flex-1 min-w-0 pr-2">
                            <span
                                className="block truncate text-sm text-white/90"
                                title={`#${p.seed} — ${p.name}${p.club ? ' · ' + p.club : ''}`}
                            >
                                <span className="font-mono text-white/60">#{p.seed}</span>
                                <span className="mx-2 text-white/25">—</span>
                                {p.name}
                                {p.club ? <em className="text-white/45"> · {p.club}</em> : null}
                            </span>
                        </div>
                        {!readOnly && (
                            <button
                                onClick={() => removeAt(i)}
                                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 hover:border-red-400/40 hover:text-red-200 text-red-300 transition-colors"
                                aria-label={`${p.name} sil`}
                                type="button"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                {players.length === 0 && <p className="text-sm text-gray-500">Henüz sporcu eklenmedi.</p>}
                {players.length > 0 && shown.length === 0 && <p className="text-sm text-gray-500">Eşleşen sporcu yok.</p>}
            </div>

            {/* ARAMA */}
            <div className="pt-3 mt-3 border-t border-white/10">
                <input
                    className="w-full rounded-2xl px-4 py-2.5 bg-black/20 border border-white/10 text-white/90 placeholder:text-white/35 focus:outline-none focus:border-premium-accent/55 transition-colors"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="(Sporcu ara...)"
                />
            </div>
        </div>
    );
}
