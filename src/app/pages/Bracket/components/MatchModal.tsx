/* =========================================================================
   MATCH MODAL – skor + (time/court girişi)
   - İsimler sadece görüntülenir (değiştirilemez)
   - Set sayısı: min 1, max 3
   - Time normalizasyonu:
       "14"   → 14.00
       "9.3"  → 09.30
       "9.4"  → 09.40
       "9:5"  → 09.50
       "07,45"→ 07.45
   Not: Meta tipinde time/court alanları olmalı (hooks/useBracket.tsx → Meta).
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
    // isimler read-only
    const names: [string, string] = [match.players[0].name, match.players[1].name];

    const [scores, setScores] = useState<[string, string][]>(
        match.meta?.scores?.length
            ? match.meta!.scores.map(([a, b]) => [String(a), String(b)])
            : [['', '']]
    );

    const [manual, setManual] = useState<0 | 1 | undefined>(match.meta?.manual);
    // "14.00" gelmişse input="time" için "14:00" yap
    const [timeRaw, setTimeRaw] = useState(
        match.meta?.time ? match.meta.time.replace('.', ':') : ''
    );

    const [court, setCourt] = useState(match.meta?.court ?? '');

    const addSet = () =>
        setScores(prev => (prev.length < 3 ? [...prev, ['', '']] : prev));

    const removeLastSet = () =>
        setScores(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));

    const save = () => {
        const parsed: [number, number][] = scores.map(([a, b]) => [
            Number(a) || 0,
            Number(b) || 0,
        ]);

        const meta: Meta = {
            scores: parsed,
            manual,
            // input="time" → "HH:MM"
            time: timeRaw || undefined,
            court: court || undefined,
        };
        onSave(meta);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#3c3e46] rounded w-[600px] text-gray-100">
                <header className="flex justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold">Report Scores</h2>
                    <button onClick={onClose}>✕</button>
                </header>

                <section className="p-6 space-y-6">
                    {/* iki takım satırı */}
                    {[0, 1].map(idx => (
                        <div key={idx} className="flex items-center gap-4">
              <span className="w-6 text-right opacity-60">
                {match.players[idx].seed}
              </span>

                            {/* isimler değiştirilemez */}
                            <input
                                value={names[idx]}
                                disabled
                                className="flex-1 bg-[#262930] px-3 py-2 rounded opacity-70"
                            />

                            <input
                                type="radio"
                                name="winner"
                                checked={manual === idx}
                                onChange={() => setManual(idx as 0 | 1)}
                                title="Kazananı elle işaretle"
                            />

                            {scores.map((set, setIdx) => (
                                <input
                                    key={setIdx}
                                    value={set[idx]}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                                        setScores(arr => {
                                            const copy = [...arr] as [string, string][];
                                            copy[setIdx] = idx
                                                ? [copy[setIdx][0], v]
                                                : [v, copy[setIdx][1]];
                                            return copy;
                                        });
                                    }}
                                    className="w-12 text-center bg-[#262930] px-1 py-2 rounded"
                                />
                            ))}
                        </div>
                    ))}

                    {/* set ekle / kaldır (min 1, max 3) */}
                    <div className="flex items-center gap-3">
                        <button onClick={addSet} className="text-blue-400 hover:underline text-sm">
                            + ADD SET
                        </button>
                        <button
                            onClick={removeLastSet}
                            disabled={scores.length <= 1}
                            className="text-sm px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Son seti kaldır"
                        >
                            Remove last set
                        </button>
                    </div>

                    {/* time & court */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm">Time</label>
                            <input
                                type="time"
                                step={60}
                                value={timeRaw}
                                onChange={e => setTimeRaw(e.target.value)}
                                className="w-full bg-[#262930] px-3 py-2 rounded"
                             />
                             <p className="text-xs text-gray-300 mt-1">Saat seçiniz (örn: 14:00)</p>

                        </div>
                        <div>
                            <label className="block mb-1 text-sm">Court #</label>
                            <input
                                value={court}
                                onChange={e => setCourt(e.target.value.replace(/[^\w- ]/g, '').slice(0, 8))}
                                placeholder="1"
                                className="w-full bg-[#262930] px-3 py-2 rounded"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between pt-5">
                        <button
                            onClick={() => {
                                setScores([['', '']]);
                                setManual(undefined);
                                setTimeRaw('');
                                setCourt('');
                            }}
                            className="text-gray-300 hover:text-white text-sm"
                        >
                            Reset
                        </button>
                        <button
                            onClick={save}
                            className="bg-sky-600 hover:bg-sky-700 px-6 py-2 rounded font-semibold"
                        >
                            Submit
                        </button>
                    </div>
                </section>
            </div>
        </div>,
        document.body
    );
}
