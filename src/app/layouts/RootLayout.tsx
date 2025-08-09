// src/app/layouts/RootLayout.tsx
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { BracketPlayersProvider } from '../context/BracketPlayersCtx'
import { BracketSettingsProvider } from '../context/BracketSettingsCtx'
import { BracketThemeProvider } from '../context/BracketThemeContext'

export default function RootLayout() {
    const location = useLocation()
    const { pathname, search, state } = location
    const isBracket = pathname.startsWith('/bracket')
    const isCreate  = pathname.startsWith('/create')

    // Sidebar içerik paneli açık/kapalı (ikon rayı her zaman görünür)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(isBracket)
    useEffect(() => setSidebarOpen(isBracket), [isBracket])

    // Tam ekran modunda sidebar tamamen saklanır (ikon rayı da yok)
    const [fs, setFs] = useState(false)

    // Başlık: query ?title varsa onu, yoksa state.title, o da yoksa boş
    const sp = new URLSearchParams(search)
    const titleFromQuery = sp.get('title')
    const titleFromState =
        (state as undefined | { title?: string })?.title ??
        (state as undefined | { item?: { title?: string } })?.item?.title
    const bracketTitle = isBracket
        ? decodeURIComponent(titleFromQuery || titleFromState || '')
        : ''

    // Tam ekrandan çıkış butonu
    const exitFullscreen = async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen()
        } finally {
            setFs(false)
        }
    }

    return (
        <div className="flex flex-col h-screen">
            <Header
                showCreate={!isCreate}
                showSave={isBracket}
                bracketTitle={bracketTitle}
            />

            <div className="flex flex-1 overflow-hidden bg-[#1f2229] relative">
                {isBracket ? (
                    <BracketPlayersProvider>
                        <BracketSettingsProvider>
                            <BracketThemeProvider>
                                {/* Tam ekranda sidebar tamamen gizlenir */}
                                {!fs && (
                                    <Sidebar
                                        isOpen={sidebarOpen}
                                        onToggle={() => setSidebarOpen(o => !o)}
                                        onEnterFullscreen={() => setFs(true)}
                                    />
                                )}

                                <main className="flex-1 overflow-auto p-4">
                                    <Outlet />
                                </main>

                                {/* Tam ekranda sol alt köşede geri ok */}
                                {fs && (
                                    <button
                                        onClick={exitFullscreen}
                                        aria-label="Tam ekrandan çık"
                                        className="fixed left-2 bottom-2 z-50 rounded-full w-10 h-10 flex items-center justify-center
                               bg-black text-white/90 border border-white/20 hover:bg-black/90"
                                        title="Tam ekrandan çık"
                                    >
                                        ❮
                                    </button>
                                )}
                            </BracketThemeProvider>
                        </BracketSettingsProvider>
                    </BracketPlayersProvider>
                ) : (
                    <main className="flex-1 overflow-auto p-4">
                        <Outlet />
                    </main>
                )}
            </div>
        </div>
    )
}
