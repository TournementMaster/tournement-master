// src/app/layouts/RootLayout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'            // ← Sidebar import’u

// Bracket ile ilgili context sağlayıcıları
import { BracketPlayersProvider } from '../context/BracketPlayersCtx'
import { BracketSettingsProvider } from '../context/BracketSettingsCtx'
import { BracketThemeProvider } from '../context/BracketThemeContext'

export default function RootLayout(): ReactNode {
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const isBracketPage = location.pathname.startsWith('/bracket')
    const showCreate    = !location.pathname.startsWith('/create')
    const match         = location.pathname.match(/^\/bracket\/(.+)/)
    const bracketTitle  = match ? match[1] : ''

    return (
        <div className="flex flex-col h-screen">
            {/* Header hep görünür */}
            <Header
                showSave={isBracketPage}
                showCreate={showCreate}
                bracketTitle={bracketTitle}
                toggleSidebar={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
            />

            {isBracketPage ? (
                /* Sadece bracket sayfasında sidebar + context */
                <BracketPlayersProvider>
                    <BracketSettingsProvider>
                        <BracketThemeProvider>
                            <div className="flex flex-1 overflow-hidden">
                                <Sidebar isOpen={sidebarOpen} />
                                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                                    <Outlet />
                                </main>
                            </div>
                        </BracketThemeProvider>
                    </BracketSettingsProvider>
                </BracketPlayersProvider>
            ) : (
                /* Diğer sayfalarda sadece içerik */
                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                    <Outlet />
                </main>
            )}
        </div>
    )
}
