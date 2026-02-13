export type MatchNoConflictItem = {
    no: string;
    reason: string;
};

type Props = {
    open: boolean;
    items: MatchNoConflictItem[];
    onCancel: () => void;
    onProceed: () => void;
};

export default function MatchNoConflictModal({
    open,
    items,
    onCancel,
    onProceed,
}: Props) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center">
            <div className="bg-[#0f1217] text-white rounded-xl p-5 w-[min(92vw,620px)] shadow-2xl border border-white/10">
                <div className="text-lg font-semibold mb-2">Maç numarası çakışması</div>
                <div className="text-sm text-white/80 mb-4">
                    Bazı maç numaraları aynı gün içinde başka bir maçla çakışıyor olabilir.
                    Yine de kaydetmek istiyor musunuz?
                </div>

                <div className="max-h-[240px] overflow-auto rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-2">
                    {items.map((x, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="font-mono text-amber-200 min-w-[90px]">{x.no}</div>
                            <div className="text-white/80">{x.reason}</div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onProceed}
                        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500"
                    >
                        Yine de kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
