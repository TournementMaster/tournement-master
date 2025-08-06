import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Header  from '../components/Header';
import { BracketThemeProvider } from '../context/BracketThemeContext';

export default function RootLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { pathname } = useLocation();

    /* “Bracket oluştur” sayfasında kenar boşluğu daralt */
    const innerClass = pathname.startsWith('/create')
        ? 'flex-1 overflow-auto pl-3 pr-6 py-6'
        : 'flex-1 overflow-auto p-6';

    return (
        <BracketThemeProvider>
            <div className="flex min-h-screen bg-[#1e1f23] text-gray-100">
                <Sidebar open={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

                {/* içerik */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                    <main className={innerClass}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </BracketThemeProvider>
    );
}
