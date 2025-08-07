import { useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel     from './SettingsPanel'
import ThemePanel        from './ThemePanel'
import SubTournamentSettingsPanel from './SubTournamentSettingsPanel' // ← EKLENDİ

interface Props {
    isOpen: boolean
    onToggle: () => void
}

export default function Sidebar({ isOpen, onToggle }: Props) {
    // ↓ Yeni sekme tipi eklendi
    const [active, setActive] = useState<'subsettings'|'participants'|'settings'|'theme'>('subsettings')

    return (
        <aside className="flex h-full">
            {/* ikon kolon */}
            <nav className="flex flex-col items-center bg-[#2b2e36] text-white py-4 w-12">
                <button
                    className="mb-4 p-2 rounded hover:bg-gray-700"
                    title={isOpen ? 'Paneli kapat' : 'Paneli aç'}
                    onClick={onToggle}
                >
                    {isOpen ? '«' : '»'}
                </button>

                {/* ↑ En üste yeni sekme */}
                <button
                    className={`mb-4 p-2 rounded hover:bg-gray-700 ${active==='subsettings' ? 'bg-gray-700' : ''}`}
                    title="Alt Turnuva Ayarları"
                    onClick={()=>setActive('subsettings')}
                >
                    📝
                </button>

                <button
                    className={`mb-4 p-2 rounded hover:bg-gray-700 ${active==='participants' ? 'bg-gray-700' : ''}`}
                    onClick={()=>setActive('participants')}
                >
                    👥
                </button>
                <button
                    className={`mb-4 p-2 rounded hover:bg-gray-700 ${active==='settings' ? 'bg-gray-700' : ''}`}
                    onClick={()=>setActive('settings')}
                >
                    ⚙️
                </button>
                <button
                    className={`p-2 rounded hover:bg-gray-700 ${active==='theme' ? 'bg-gray-700' : ''}`}
                    onClick={()=>setActive('theme')}
                >
                    🎨
                </button>
            </nav>

            {/* içerik paneli */}
            {isOpen && (
                <div className="w-64 bg-[#2b2e36] text-white p-4 overflow-auto">
                    {active==='subsettings'  && <SubTournamentSettingsPanel />}
                    {active==='participants' && <ParticipantsPanel />}
                    {active==='settings'     && <SettingsPanel />}
                    {active==='theme'        && <ThemePanel />}
                </div>
            )}
        </aside>
    )
}
