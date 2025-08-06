import ReactDOM from 'react-dom';
import { useState } from 'react';
import type { Match, Meta } from '../../../hooks/useBracket';

interface Props {
    match: Match;
    onSave: (m: Meta) => void;
    onClose: () => void;
}

export default function MatchModal({ match, onSave, onClose }: Props) {
    const [boxCount, setBox] = useState<number>(match.meta?.scores?.length ?? 0);
    const [scores, setScores] = useState<string[]>(
        (match.meta?.scores ?? []).map(String)
    );

    const changeScore = (i: number, val: string) => {
        const next = [...scores];
        next[i] = val.replace(/\D/g, '').slice(0, 3);
        setScores(next);
    };

    const modal = (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white text-gray-800 rounded p-6 w-96 space-y-4">
                <h2 className="text-center text-lg font-semibold">Eşleşme Bilgisi</h2>

                {/* kutu adedi */}
                <label className="block text-sm font-medium">Puan kutusu (0-6)</label>
                <input
                    type="number"
                    min={0}
                    max={6}
                    value={boxCount}
                    onChange={e => {
                        const n = Math.max(0, Math.min(6, Number(e.target.value) || 0));
                        setBox(n);
                        setScores(s => s.slice(0, n).concat(Array(n).fill('')).slice(0, n));
                    }}
                    className="w-24 border px-2 py-1"
                />

                {/* puanlar */}
                {boxCount > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: boxCount }).map((_, i) => (
                            <input
                                key={i}
                                value={scores[i] || ''}
                                onChange={e => changeScore(i, e.target.value)}
                                placeholder={`Puan ${i + 1}`}
                                className="border px-2 py-1"
                            />
                        ))}
                    </div>
                )}

                {/* kazanan */}
                <div className="flex gap-4">
                    {match.players.map((p, i) => (
                        <label key={i} className="flex items-center gap-1 text-sm">
                            <input
                                type="radio"
                                name="w"
                                value={i}
                                defaultChecked={match.meta?.winner === i}
                            />{' '}
                            {p.name}
                        </label>
                    ))}
                </div>

                {/* kaydet */}
                <button
                    className="bg-blue-600 w-full text-white py-1 rounded"
                    onClick={() => {
                        const meta: Meta = {
                            scores: scores.slice(0, boxCount).map(s => Number(s) || 0),
                            winner: Number(
                                (
                                    document.querySelector(
                                        'input[name=w]:checked'
                                    ) as HTMLInputElement
                                )?.value
                            ),
                        };
                        onSave(meta);
                    }}
                >
                    Kaydet
                </button>

                <button onClick={onClose} className="w-full py-1 text-sm text-gray-600">
                    İptal
                </button>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modal, document.body);
}
