/* =========================================================================
   MATCH MODAL – sade “Report Scores” (Match Info yok)
   – + ADD SET sorunsuz çalışır
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
    /* ---------- state ---------- */
    const [names,  setNames]  = useState<[string,string]>([
        match.players[0].name,
        match.players[1].name,
    ]);

    const [scores, setScores] = useState<[string,string][]>(
        match.meta?.scores?.length
            ? match.meta!.scores.map(([a,b])=>[String(a),String(b)])
            : [['','']]
    );

    const [manual, setManual] = useState<0|1|undefined>(match.meta?.manual);

    /* ---------- handlers ---------- */
    const addSet = () => setScores(prev=>[...prev,['','']]);

    const save = () => {
        const parsed : [number,number][] = scores.map(([a,b])=>[
            Number(a)||0, Number(b)||0,
        ]);
        const meta:Meta = { teamNames:names, scores:parsed, manual };
        onSave(meta);
    };

    /* ---------- render ---------- */
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#3c3e46] rounded w-[550px] text-gray-100">
                <header className="flex justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold">Report Scores</h2>
                    <button onClick={onClose}>✕</button>
                </header>

                <section className="p-6 space-y-6">
                    {[0,1].map(idx=>(
                        <div key={idx} className="flex items-center gap-4">
              <span className="w-6 text-right opacity-60">
                {match.players[idx].seed}
              </span>

                            <input
                                value={names[idx]}
                                onChange={e=>{
                                    const v=e.target.value.slice(0,24);
                                    setNames(t=>idx?[t[0],v]:[v,t[1]]);
                                }}
                                className="flex-1 bg-[#262930] px-3 py-2 rounded"
                            />

                            <input type="radio" name="winner"
                                   checked={manual===idx}
                                   onChange={()=>setManual(idx as 0|1)} />

                            {scores.map((set,setIdx)=>(
                                <input key={setIdx}
                                       value={set[idx]}
                                       onChange={e=>{
                                           const v=e.target.value.replace(/\D/g,'').slice(0,2);
                                           setScores(arr=>{
                                               const copy=[...arr] as [string,string][];
                                               copy[setIdx] = idx
                                                   ? [copy[setIdx][0], v]
                                                   : [v, copy[setIdx][1]];
                                               return copy;
                                           });
                                       }}
                                       className="w-12 text-center bg-[#262930] px-1 py-2 rounded"/>
                            ))}
                        </div>
                    ))}

                    <button onClick={addSet}
                            className="text-blue-400 hover:underline text-sm">
                        + ADD SET
                    </button>

                    <div className="flex justify-between pt-5">
                        <button onClick={()=>setScores([['','']])}
                                className="text-gray-300 hover:text-white text-sm">
                            Reset Scores
                        </button>
                        <button onClick={save}
                                className="bg-sky-600 hover:bg-sky-700 px-6 py-2 rounded font-semibold">
                            Submit Scores
                        </button>
                    </div>
                </section>
            </div>
        </div>,
        document.body,
    );
}
