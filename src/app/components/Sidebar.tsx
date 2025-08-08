import { useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel     from './SettingsPanel'
import ThemePanel        from './ThemePanel'

interface Props { isOpen: boolean }

export default function Sidebar({ isOpen }: Props) {
    const [active, setActive] = useState<'participants' | 'settings' | 'theme'>('participants')

    if (!isOpen) return null

    return (
        <div className="flex">
            {/* A) Sadece ikonlar */}
            <nav className="flex flex-col bg-[#2b2e36] p-4 space-y-4">
                <button onClick={() => setActive('participants')} className="text-2xl hover:text-white">👥</button>
                <button onClick={() => setActive('settings')}     className="text-2xl hover:text-white">⚙️</button>
                <button onClick={() => setActive('theme')}        className="text-2xl hover:text-white">🎨</button>
            </nav>

            {/* B) İçerik sağa doğru açılıyor */}
            <div className="bg-[#2d3038] p-4 w-72">
                {active === 'participants' && <ParticipantsPanel />}
                {active === 'settings'     && <SettingsPanel />}
                {active === 'theme'        && <ThemePanel />}
            </div>
        </div>
    )
}
