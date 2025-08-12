import { useLocation } from 'react-router-dom';

export default function BracketHeaderActions() {
    const { pathname } = useLocation();
    // Sadece /bracket/... sayfalarında göster
    if (!/^\/bracket\/.+/.test(pathname)) return null;

    const send = (name: string) => window.dispatchEvent(new CustomEvent(name));

    return (
        <div className="hidden md:flex items-center gap-2 mr-2">
            <button
                type="button"
                onClick={() => send('bracket:enter-edit')}
                className="px-3 py-[6px] rounded-md text-sm border border-white/20 bg-white/10 hover:bg-white/15 text-white"
                title="Edit moduna geç"
            >
                Edit Moduna Geç
            </button>

            <button
                type="button"
                onClick={() => send('bracket:enter-view')}
                className="px-3 py-[6px] rounded-md text-sm border border-white/20 bg-white/10 hover:bg-white/15 text-white"
                title="View moduna dön"
            >
                View
            </button>

            <button
                type="button"
                onClick={() => send('bracket:refresh')}
                className="px-3 py-[6px] rounded-md text-sm border border-white/20 bg-white/10 hover:bg-white/15 text-white"
                title="Backend'den veriyi yenile"
            >
                Yenile
            </button>
        </div>
    );
}
