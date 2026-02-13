// src/app/layouts/RootLayout.tsx
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { BracketPlayersProvider } from '../context/BracketPlayersCtx';
import { BracketSettingsProvider } from '../context/BracketSettingsCtx';
import { BracketThemeProvider } from '../context/BracketThemeContext';

const SIDEBAR_KEY = 'tm.sidebar.collapsed'; // '1' => collapsed/kapalı

export default function RootLayout() {
    const { pathname } = useLocation();
    const isBracket = pathname.startsWith('/bracket');
    const isCreate = pathname.startsWith('/create');

    // ↙️ EKRAN GENİŞLİĞİ: desktop mı? (md:768px+)
    const isDesktop = useMemo(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(min-width: 768px)').matches;
    }, []);

    // ↙️ BAŞLANGIÇ: localStorage varsa ona uy; yoksa desktop→açık, mobil→kapalı
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const persisted = window.localStorage.getItem(SIDEBAR_KEY);
        if (persisted != null) return persisted !== '1';
        return isBracket ? isDesktop : false; // bracket’ta mobil kapalı; diğer sayfalarda önemli değil
    });

    // ↙️ BRACKET SAYFASINA GİRİNCE varsayılanı tekrar uygula (persisted > media query)
    useEffect(() => {
        if (!isBracket) return;
        setSidebarOpen(isDesktop);
    }, [isBracket, isDesktop]);

    // ↙️ ROOT CLASS + PERSIST
    useEffect(() => {
        document.documentElement.classList.toggle('sidebar-open', sidebarOpen);
        document.documentElement.classList.toggle('sidebar-collapsed', !sidebarOpen);
        window.localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '0' : '1');
    }, [sidebarOpen]);

    // ↙️ GLOBAL TOGGLE EVENT (Sidebar veya başka yerlerden tetiklenebilir)
    useEffect(() => {
        const onToggle = () => setSidebarOpen(prev => !prev);
        window.addEventListener('layout:sidebar-toggle', onToggle as any);
        return () => window.removeEventListener('layout:sidebar-toggle', onToggle as any);
    }, []);

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
                                <Sidebar
                                    isOpen={sidebarOpen}
                                    onToggle={() => setSidebarOpen(o => !o)}
                                />
                                <main className="flex-1 overflow-visible bg-transparent p-4">
                                    <Outlet />
                                </main>
                            </BracketThemeProvider>
                        </BracketSettingsProvider>
                    </BracketPlayersProvider>
                ) : (
                    <main className="flex-1 overflow-auto bg-transparent p-4">
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
