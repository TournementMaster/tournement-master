// src/app/layouts/RootLayout.tsx
import  { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { BracketPlayersProvider } from '../context/BracketPlayersCtx'
import { BracketSettingsProvider } from '../context/BracketSettingsCtx'
import { BracketThemeProvider } from '../context/BracketThemeContext'

export default function RootLayout() {
    const { pathname } = useLocation()
    const isBracket   = pathname.startsWith('/bracket')
    const isCreate    = pathname.startsWith('/create')

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(isBracket)
    useEffect(() => setSidebarOpen(isBracket), [isBracket])

    const titlePart = isBracket ? decodeURIComponent(pathname.split('/')[2] || '') : ''

    return (
        <div className="flex flex-col h-screen">
            {/* 1) Header — ok-tuș artık burada hiç yok */}
            <Header
                showToggle={false}
                toggleSidebar={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
                showCreate={!isCreate}
                showSave={isBracket}
                bracketTitle={titlePart}
            />

            {/* 2) Bracket sayfasındaysak, header’ın hemen altında ok-tuș */}
            {isBracket && (
                <div className="px-8 py-2 bg-[#373a42]">
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        aria-label={sidebarOpen ? 'Kapat' : 'Aç'}
                        className="rounded-full p-2 bg-teal-400 hover:bg-teal-300 text-white text-2xl shadow-lg transition"
                    >
                        {sidebarOpen ? '❮' : '❯'}
                    </button>
                </div>
            )}

            {/* 3) İçerik */}
            <div className="flex flex-1 overflow-hidden">
                {isBracket ? (
                    <BracketPlayersProvider>
                        <BracketSettingsProvider>
                            <BracketThemeProvider>
                                <Sidebar isOpen={sidebarOpen} />
                                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                                    <Outlet/>
                                </main>
                            </BracketThemeProvider>
                        </BracketSettingsProvider>
                    </BracketPlayersProvider>
                ) : (
                    <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                        <Outlet/>
                    </main>
                )}
            </div>
        </div>
    )
}
