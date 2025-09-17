import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
    const { pathname } = useLocation();
    return (
        <div className="min-h-[60vh] grid place-items-center px-4">
            <div className="max-w-xl text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/15 text-rose-300 text-2xl mb-4">404</div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Sayfa bulunamadı</h1>
                <p className="text-gray-300 mb-6">
                    <span className="font-mono text-sm bg-black/30 px-2 py-1 rounded">{pathname}</span> için bir sayfa yok.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => history.back()} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">
                        ← Geri
                    </button>
                    <Link to="/" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
                        Ana sayfaya dön
                    </Link>
                </div>
            </div>
        </div>
    );
}
