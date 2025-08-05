import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';

export default function CreateChooser({ onClose }: { onClose: () => void }) {
    // ESC ile kapatma
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            aria-modal="true"
            role="dialog"
        >
            {/* Arka plan */}
            <div
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
            />

            {/* İçerik */}
            <div className="relative z-10 w-[min(92vw,40rem)]">
                <div className="bg-[#2d3038] rounded-xl shadow-xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Yeni Turnuva</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center"
                            aria-label="Kapat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* İki “lite box” */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            to="/create/main"
                            onClick={onClose}
                            className="block rounded-lg border border-white/10 bg-[#23252b] hover:bg-[#272a31] transition p-4"
                        >
                            <div className="text-base font-semibold mb-1">Ana Turnuva Oluştur</div>
                            <p className="text-sm text-gray-300">
                                Kapsayıcı bir ana turnuva yapısı oluşturun. Alt turnuvaları sonra ekleyebilirsiniz.
                            </p>
                        </Link>

                        <Link
                            to="/create/sub"
                            onClick={onClose}
                            className="block rounded-lg border border-white/10 bg-[#23252b] hover:bg-[#272a31] transition p-4"
                        >
                            <div className="text-base font-semibold mb-1">Alt Turnuva Oluştur</div>
                            <p className="text-sm text-gray-300">
                                Var olan bir ana turnuva içine alt turnuva tanımlayın.
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modal, document.body);
}
