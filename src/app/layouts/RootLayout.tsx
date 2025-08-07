// src/app/layouts/RootLayout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

import { BracketPlayersProvider } from '../context/BracketPlayersCtx'
import { BracketSettingsProvider } from '../context/BracketSettingsCtx'
import { BracketThemeProvider } from '../context/BracketThemeContext'

export default function RootLayout(): ReactNode {
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const isBracketPage = location.pathname.startsWith('/bracket')

    // ↓ Güncellendi: bracket sayfasında da oluştur butonu gizlensin
    const showCreate =
        !location.pathname.startsWith('/create') &&
        !location.pathname.startsWith('/bracket')

    const sp = new URLSearchParams(location.search)
    const bracketTitle = isBracketPage ? (sp.get('title') ?? '') : ''

    return (
        <div className="flex flex-col h-screen">
            <Header
                showSave={isBracketPage}
                showCreate={showCreate}
                bracketTitle={bracketTitle}
            />

            {isBracketPage ? (
                <BracketPlayersProvider>
                    <BracketSettingsProvider>
                        <BracketThemeProvider>
                            <div className="flex flex-1 overflow-hidden">
                                <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
                                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                                    <Outlet />
                                </main>
                            </div>
                        </BracketThemeProvider>
                    </BracketSettingsProvider>
                </BracketPlayersProvider>
            ) : (
                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                    <Outlet />
                </main>
            )}
        </div>
    )
}
