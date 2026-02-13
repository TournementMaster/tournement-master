type Props = {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function StartConfirmModal({ open, onConfirm, onCancel }: Props) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-[#0f1217] text-white rounded-xl p-5 w-[min(92vw,520px)] shadow-2xl border border-white/10">
                <div className="text-lg font-semibold mb-2">Maçı Başlat</div>
                <div className="text-sm text-white/80 mb-4">
                    Maçı başlatmak istediğinize emin misiniz?{' '}
                    <b>Bundan sonra sporcu ekleme/çıkarma yapamazsınız.</b>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500"
                    >
                        Maçı Başlat
                    </button>
                </div>
            </div>
        </div>
    );
}
