// src/app/layouts/RootLayout.tsx
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { BracketPlayersProvider } from '../context/BracketPlayersCtx'
import { BracketSettingsProvider } from '../context/BracketSettingsCtx'
import { BracketThemeProvider } from '../context/BracketThemeContext'

export default function RootLayout() {
    const { pathname, search } = useLocation()
    const isBracket = pathname.startsWith('/bracket')
    const isCreate  = pathname.startsWith('/create')

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(isBracket)
    useEffect(() => setSidebarOpen(isBracket), [isBracket])

    // Başlık: ?title=... öncelikli
    const sp = new URLSearchParams(search)
    const titleFromQuery = sp.get('title') || ''
    const slugPart = isBracket ? decodeURIComponent(pathname.split('/')[2] || '') : ''
    const titlePart = titleFromQuery || slugPart

    const openSidebarOnIcon = () => setSidebarOpen(true)

    return (
        <div className="flex flex-col h-screen">
            <Header
                showToggle={false}
                toggleSidebar={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
                showCreate={!isCreate && !isBracket}
                showSave={isBracket}
                bracketTitle={titlePart}
            />

            {/* Header altındaki ok şeridi — sidebar ile aynı (siyah) */}
            {isBracket && (
                <div className="px-8 py-2 bg-black">
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        aria-label={sidebarOpen ? 'Kapat' : 'Aç'}
                        className="rounded-full p-2 bg-teal-500/80 hover:bg-teal-400 text-white text-2xl shadow-lg transition"
                    >
                        {sidebarOpen ? '❮' : '❯'}
                    </button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {isBracket ? (
                    <BracketPlayersProvider>
                        <BracketSettingsProvider>
                            <BracketThemeProvider>
                                <Sidebar isOpen={sidebarOpen} onAnyIconClick={openSidebarOnIcon} />
                                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                                    <Outlet />
                                </main>
                            </BracketThemeProvider>
                        </BracketSettingsProvider>
                    </BracketPlayersProvider>
                ) : (
                    <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                        <Outlet />
                    </main>
                )}
            </div>
        </div>
    )
}
