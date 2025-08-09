// src/app/components/Sidebar.tsx
import { useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel from './SettingsPanel'
import ThemePanel from './ThemePanel'
import SubTournamentSettingsPanel from './SubTournamentSettingsPanel'

interface Props {
    /** Sağdaki içerik paneli açık mı? (ikon rayı her zaman görünür) */
    isOpen: boolean
    onToggle?: () => void
    /** Tam ekrana geçildiğinde sidebar tamamen gizlenmesi için üst bileşene haber verilir */
    onEnterFullscreen?: () => void
}

type Tab = 'participants' | 'info' | 'settings' | 'theme'

/* Premium çizgisiz ikonlar */
const Icon = {
    Users: (p: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
            <path strokeWidth="1.8" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4" strokeWidth="1.8"/>
            <path strokeWidth="1.8" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 18 7"/>
        </svg>
    ),
    Info: (p: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
            <circle cx="12" cy="12" r="9" strokeWidth="1.8"/>
            <path d="M12 8h.01M11 12h2v5h-2z" strokeWidth="1.8"/>
        </svg>
    ),
    Cog: (p: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
            <path strokeWidth="1.8" d="M10.325 4.317a1 1 0 0 1 1.35-.936l1.66.6a1 1 0 0 0 .95-.17l1.2-.9a1 1 0 0 1 1.45.28l1 1.73a1 1 0 0 0 .8.5l1.78.2a1 1 0 0 1 .88 1.13l-.2 1.77a1 1 0 0 0 .5.81l1.55.9a1 1 0 0 1 .39 1.36l-.9 1.56a1 1 0 0 0 0 .98l.9 1.56a1 1 0 0 1-.39 1.36l-1.55.9a1 1 0 0 0-.5.81l.2 1.77a1 1 0 0 1-.88 1.13l-1.78.2a1 1 0 0 0-.8.5l-1 1.73a1 1 0 0 1-1.45.28l-1.2-.9a1 1 0 0 0-.95-.17l-1.66.6a1 1 0 0 1-1.35-.94l-.16-1.8a1 1 0 0 0-.55-.8l-1.67-.85a1 1 0 0 1-.5-1.32l.76-1.62a1 1 0 0 0 0-.88l-.76-1.62a1 1 0 0 1 .5-1.32l1.67-.85a1 1 0  0 .55-.8l.16-1.8z"/>
            <circle cx="12" cy="12" r="3" strokeWidth="1.8"/>
        </svg>
    ),
    Palette: (p: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
            <path strokeWidth="1.8" d="M12 3a9 9 0 0 0-9 9 7 7 0 0 0 7 7h2a2 2 0 0 0 2-2 1.5 1.5 0 0 1 1.5-1.5h1A4.5 4.5 0 0 0 21 11 8 8 0 0 0 12 3z"/>
            <circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/>
            <circle cx="14.5" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/>
        </svg>
    ),
    Full: (p: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
            <path strokeWidth="1.8" d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/>
        </svg>
    ),
}

export default function Sidebar({ isOpen, onToggle, onEnterFullscreen }: Props) {
    const [active, setActive] = useState<Tab>('participants')

    // Her ikon tıklanınca panel otomatik açılsın
    const focusTab = (t: Tab) => {
        setActive(t)
        if (!isOpen) onToggle?.()
    }

    const goFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen()
            }
        } finally {
            onEnterFullscreen?.()
        }
    }

    const TabBtn = ({
                        tab, title, children,
                    }: { tab: Tab; title: string; children: React.ReactNode }) => (
        <button
            onClick={() => focusTab(tab)}
            className={`p-2 text-gray-200 hover:text-white transition ${
                active === tab ? 'text-emerald-300' : ''
            }`}
            title={title}
            aria-label={title}
        >
            {children}
        </button>
    )

    return (
        <div className="flex">
            {/* İkon rayı – her zaman görünür, siyah arka plan */}
            <nav className="flex flex-col justify-between bg-black w-16 p-3">
                <div className="flex flex-col items-center gap-5">
                    {/* Üstte AÇ/KAPA OKU (ray ile aynı hizada) */}
                    <button
                        onClick={onToggle}
                        title={isOpen ? 'Kapat' : 'Aç'}
                        aria-label={isOpen ? 'Kapat' : 'Aç'}
                        className="mb-2 p-2 text-gray-200 hover:text-white"
                    >
                        {isOpen ? '❮' : '❯'}
                    </button>

                    <TabBtn tab="participants" title="Katılımcılar">
                        <Icon.Users className="w-7 h-7" />
                    </TabBtn>
                    <TabBtn tab="info" title="Alt Turnuva Bilgileri">
                        <Icon.Info className="w-6 h-6" />
                    </TabBtn>
                    <TabBtn tab="settings" title="Ayarlar">
                        <Icon.Cog className="w-6 h-6" />
                    </TabBtn>
                    <TabBtn tab="theme" title="Şablon & Renk">
                        <Icon.Palette className="w-7 h-7" />
                    </TabBtn>
                </div>

                {/* YouTube tarzı tam ekran */}
                <button
                    onClick={goFullscreen}
                    className="p-2 text-gray-300 hover:text-white transition self-center"
                    title="Tam Ekran"
                    aria-label="Tam Ekran"
                >
                    <Icon.Full className="w-7 h-7" />
                </button>
            </nav>

            {/* İçerik paneli – sadece isOpen true iken */}
            {isOpen && (
                <div className="bg-[#2d3038] p-4 w-72">
                    {active === 'participants' && <ParticipantsPanel />}
                    {active === 'info'         && <SubTournamentSettingsPanel />}
                    {active === 'settings'     && <SettingsPanel />}
                    {active === 'theme'        && <ThemePanel />}
                </div>
            )}
        </div>
    )
}
