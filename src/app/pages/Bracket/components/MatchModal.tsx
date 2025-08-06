/* =========================================================================
   MATCH MODAL – takım adı + tek set puan + manuel kazanan
   ========================================================================= */

import ReactDOM from 'react-dom';
import { useState } from 'react';
import type { Match, Meta } from '../../../hooks/useBracket';

interface Props {
    match:   Match;
    onSave:  (m: Meta) => void;
    onClose: () => void;
}

export default function MatchModal({ match, onSave, onClose }: Props) {
    /* ---------------- State ---------------- */
    const [names, setNames] = useState<[string, string]>([
        match.players[0].name,
        match.players[1].name,
    ]);

    const [scores, setScores] = useState<[string, string]>([
        match.meta?.scores?.[0]?.[0]?.toString() ?? '',
        match.meta?.scores?.[0]?.[1]?.toString() ?? '',
    ]);

    const [manual, setManual] = useState<0 | 1 | undefined>(
        match.meta?.manual as 0 | 1 | undefined,
    );

    /* ------------- Kaydet ------------- */
    const handleSave = () => {
        const s0 = Number(scores[0]) || 0;
        const s1 = Number(scores[1]) || 0;

        const meta: Meta = {
            teamNames: names,
            scores: [[s0, s1]],   // daima dizi (boşsa 0–0)
            manual,
        };

        onSave(meta);
    };

    /* -------------- Modal ------------- */
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#3c3e46] text-gray-100 rounded w-[500px]">
                {/* Başlık */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold">Match Editor</h2>
                    <button onClick={onClose} aria-label="Close">✕</button>
                </header>

                {/* İçerik */}
                <section className="p-6 space-y-6">
                    {[0, 1].map(idx => (
                        <div key={idx} className="flex items-center gap-4">
                            {/* Seed */}
                            <span className="w-6 text-right text-sm opacity-70">
                {match.players[idx].seed}
              </span>

                            {/* Takım adı */}
                            <input
                                value={names[idx]}
                                onChange={e => {
                                    const v = e.target.value.slice(0, 24);
                                    setNames(t => (idx ? [t[0], v] : [v, t[1]]));
                                }}
                                className="flex-1 bg-[#2e3038] px-3 py-2 rounded focus:outline-none"
                            />

                            {/* Kazanan */}
                            <input
                                type="radio"
                                name="winner"
                                checked={manual === idx}
                                onChange={() => setManual(idx as 0 | 1)}
                            />

                            {/* Skor */}
                            <input
                                value={scores[idx]}
                                onChange={e => {
                                    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                                    setScores(s => (idx ? [s[0], v] : [v, s[1]]));
                                }}
                                placeholder="0"
                                className="w-14 text-center bg-[#2e3038] px-2 py-2 rounded"
                            />
                        </div>
                    ))}

                    {/* Butonlar */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            className="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded font-semibold"
                        >
                            Save
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            </div>
        </div>,
        document.body,
    );
}
