import { useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel     from './SettingsPanel'
import ThemePanel        from './ThemePanel'
import SubTournamentSettingsPanel from './SubTournamentSettingsPanel'

interface Props {
    isOpen: boolean
    /** Bir ikon tıklanınca sidebar’ı sadece AÇ (kapatma ok ile) */
    onAnyIconClick?: () => void
}

type Tab = 'participants' | 'sub' | 'settings' | 'theme'

/* Elit/Premium inline SVG ikonları (stroke currentColor) */
function IconUsers({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
    )
}
function IconClipboardInfo({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M9 4.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="12" cy="11" r="1.3" fill="currentColor"/>
            <path d="M12 14v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
    )
}
function IconCog({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M19.4 15a7.9 7.9 0 0 0 .1-6l2-1.2-2-3.5-2.3 1A8.1 8.1 0 0 0 12 3c-1.2 0-2.4.2-3.4.6l-2.3-1-2 3.5 2 1.2a8 8 0 0 0 .1 6l-2 1.1 2 3.5 2.3-1A8.1 8.1 0 0 0 12 21c1.2 0 2.4-.2 3.4-.6l2.3 1 2-3.5-2-1.1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
    )
}
function IconPalette({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <path d="M13.5 21a8.5 8.5 0 1 0-8.2-6.5 2.5 2.5 0 0 0 2.4 2h2.1a2.2 2.2 0 0 1 0 4.5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="14.5" cy="8.5" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="8" cy="11" r="1.2" fill="currentColor"/>
            <circle cx="16" cy="12" r="1.2" fill="currentColor"/>
        </svg>
    )
}

export default function Sidebar({ isOpen, onAnyIconClick }: Props) {
    const [active, setActive] = useState<Tab>('participants')

    const click = (tab: Tab) => {
        setActive(tab)
        onAnyIconClick?.() // ikon tıklanınca AÇ
    }

    const iconBase =
        'w-[34px] h-[34px] md:w-[38px] md:h-[38px] transition-colors'

    // İkon kolonu HER ZAMAN görünür; içerik paneli sadece açıksa görünür
    return (
        <div className="flex">
            {/* Sol ikon kolonu (siyah, premium) */}
            <nav className="flex flex-col items-center bg-black px-3 py-5 space-y-6">
                <button
                    onClick={() => click('participants')}
                    className={`text-slate-200 hover:text-teal-300 ${active==='participants'?'text-teal-300':''}`}
                    title="Katılımcılar"
                >
                    <IconUsers className={iconBase}/>
                </button>

                <button
                    onClick={() => click('sub')}
                    className={`text-slate-200 hover:text-teal-300 ${active==='sub'?'text-teal-300':''}`}
                    title="Alt Turnuva Bilgileri"
                >
                    <IconClipboardInfo className={iconBase}/>
                </button>

                <button
                    onClick={() => click('settings')}
                    className={`text-slate-200 hover:text-teal-300 ${active==='settings'?'text-teal-300':''}`}
                    title="Ayarlar"
                >
                    <IconCog className={iconBase}/>
                </button>

                <button
                    onClick={() => click('theme')}
                    className={`text-slate-200 hover:text-teal-300 ${active==='theme'?'text-teal-300':''}`}
                    title="Şablon & Renk"
                >
                    <IconPalette className={iconBase}/>
                </button>
            </nav>

            {/* İçerik paneli */}
            {isOpen && (
                <div className="bg-[#2d3038] w-80 p-4 overflow-auto">
                    {active === 'participants' && <ParticipantsPanel />}
                    {active === 'sub'           && <SubTournamentSettingsPanel />}
                    {active === 'settings'      && <SettingsPanel />}
                    {active === 'theme'         && <ThemePanel />}
                </div>
            )}
        </div>
    )
}
