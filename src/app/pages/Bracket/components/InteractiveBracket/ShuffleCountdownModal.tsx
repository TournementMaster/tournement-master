type Props = { open: boolean; count: number };

export default function ShuffleCountdownModal({ open, count }: Props) {
    if (!open) return null;

    const done = count <= 0;

    return (
        <div className="fixed inset-0 z-[75] bg-black/60 flex items-center justify-center">
            <div className="rounded-2xl bg-[#0f1217] border border-white/10 shadow-2xl px-8 py-10 text-center w-[min(92vw,520px)]">
                {!done ? (
                    <>
                        <div className="text-white/80 text-sm mb-2">
                            Şablon karıştırılıyor…
                        </div>
                        <div className="text-white font-extrabold tracking-wider text-[64px] leading-none">
                            {count}
                        </div>
                    </>
                ) : (
                    <div className="text-emerald-300 font-semibold text-xl">
                        Şablon karıştırıldı ✓
                    </div>
                )}
            </div>
        </div>
    );
}
