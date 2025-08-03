import ReactDOM from 'react-dom';
import type {Match, Meta} from "../../../hooks/useBracket.tsx";

interface Props {
    match: Match;
    onSave: (m: Meta) => void;
    onClose: () => void;
}

export default function MatchModal({ match, onSave, onClose }: Props) {
    const modal = (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white text-gray-800 rounded p-6 w-80 space-y-3">
                <h2 className="text-center text-base font-medium">Eşleşme Bilgisi</h2>

                <input id="d" type="date" className="w-full border px-2 py-1" />
                <input id="t" type="time" className="w-full border px-2 py-1" />
                <input
                    id="s"
                    type="text"
                    placeholder="Skor (örn 2-1)"
                    className="w-full border px-2 py-1"
                />

                <div className="flex gap-4">
                    {match.players.map((p, i) => (
                        <label key={i} className="flex items-center gap-1 text-sm">
                            <input type="radio" name="w" value={i} /> {p.name}
                        </label>
                    ))}
                </div>

                <button
                    className="bg-blue-600 w-full text-white py-1 rounded"
                    onClick={() => {
                        const meta: Meta = {
                            date: (document.getElementById('d') as HTMLInputElement).value,
                            time: (document.getElementById('t') as HTMLInputElement).value,
                            score: (document.getElementById('s') as HTMLInputElement).value,
                            winner: Number(
                                (document.querySelector('input[name=w]:checked') as HTMLInputElement)?.value
                            ),
                        };
                        onSave(meta);
                    }}
                >
                    Kaydet
                </button>

                <button
                    className="w-full py-1 text-sm text-gray-600"
                    onClick={onClose}
                >
                    İptal
                </button>
            </div>
        </div>
    );

    /*  <<===  Body altına portallıyoruz  ===>>  */
    return ReactDOM.createPortal(modal, document.body);
}
