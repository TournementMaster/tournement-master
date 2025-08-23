// src/app/layouts/RootLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { BracketPlayersProvider } from '../context/BracketPlayersCtx';
import { BracketSettingsProvider } from '../context/BracketSettingsCtx';
import { BracketThemeProvider } from '../context/BracketThemeContext';

export default function RootLayout() {
    const { pathname } = useLocation();
    const isBracket = pathname.startsWith('/bracket');
    const isCreate = pathname.startsWith('/create');

    // Bracket sayfasında sidebar açık başlasın
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(isBracket);
    useEffect(() => setSidebarOpen(isBracket), [isBracket]);

    // 401 toast
    const [unauth, setUnauth] = useState(false);
    useEffect(() => {
        const h = () => {
            setUnauth(true);
            setTimeout(() => setUnauth(false), 2500);
        };
        window.addEventListener('api:unauthorized' as any, h);
        return () => window.removeEventListener('api:unauthorized' as any, h);
    }, []);

    return (
        <div className="flex flex-col h-screen">
            <Header showSave={isBracket} />

            <div className="flex flex-1 overflow-hidden">
                {isBracket ? (
                    <BracketPlayersProvider>
                        <BracketSettingsProvider>
                            <BracketThemeProvider>
                                {/* Ok düğmesi artık Sidebar içinde; sadece toggle fonksiyonu veriyoruz */}
                                <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
                                <main className="flex-1 overflow-visible bg-[#1f2229] p-4">
                                    <Outlet />
                                </main>
                            </BracketThemeProvider>
                        </BracketSettingsProvider>
                    </BracketPlayersProvider>
                ) : (
                    <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                        {!isCreate && null}
                        <Outlet />
                    </main>
                )}
            </div>

            {unauth && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded bg-black/70 text-white text-sm">
                    Yetki yok (401)
                </div>
            )}
        </div>
    );
}
