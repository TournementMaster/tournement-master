import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function AppErrorPage() {
    const error = useRouteError();

    // İsteğe bağlı: analytics/raporlama
    useEffect(() => {
        // console.error(error);
    }, [error]);

    const title = isRouteErrorResponse(error)
        ? `${error.status} – ${error.statusText || 'Hata'}`
        : 'Bir şeyler ters gitti';

    const detail = isRouteErrorResponse(error)
        ? (error.data as any)?.message || (error.data as any) || ''
        : (error as any)?.message || '';

    return (
        <div className="min-h-[60vh] grid place-items-center px-4">
            <div className="max-w-xl text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 text-amber-300 text-2xl mb-4">!</div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{title}</h1>
                {!!detail && <p className="text-gray-300 mb-3">{String(detail)}</p>}
                <p className="text-gray-400 mb-6">Sayfayı yenilemeyi ya da ana sayfaya dönmeyi deneyin.</p>
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => location.reload()} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">
                        Yenile
                    </button>
                    <Link to="/" className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Ana sayfa</Link>
                </div>
            </div>
        </div>
    );
}
