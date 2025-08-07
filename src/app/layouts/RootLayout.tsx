import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

export default function RootLayout() {
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // showSave only on /bracket/*
    const showSave   = location.pathname.startsWith('/bracket')
    // showCreate on all but /create
    const showCreate = !location.pathname.startsWith('/create')
    // bracketTitle from URL or empty
    const subMatch   = location.pathname.match(/^\/bracket\/(.+)/)
    const bracketTitle = subMatch ? decodeURIComponent(subMatch[1]) : ''

    return (
        <div className="flex flex-col h-screen">
            <Header
                showSave={showSave}
                showCreate={showCreate}
                bracketTitle={bracketTitle}
                toggleSidebar={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
            />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar isOpen={sidebarOpen}/>
                <main className="flex-1 overflow-auto bg-[#1f2229] p-4">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
