import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from "../components/Sidebar.tsx";
import Header from "../components/Header.tsx";

export default function RootLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);


    // Ana sayfa ve "Ana Turnuva Oluştur" ekranında sidebar gözükmesin




    const showSidebar = false;

    return (
        <div className="flex min-h-screen bg-[#1e1f23] text-gray-100">
            {showSidebar && (
                <Sidebar open={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
            )}
            <div className="flex-1 flex flex-col">
                <Header toggleSidebar={showSidebar ? () => setSidebarOpen(!sidebarOpen) : undefined} />
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
