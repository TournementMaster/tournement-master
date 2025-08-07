import { useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel     from './SettingsPanel'
import ThemePanel        from './ThemePanel'

interface Props {
    isOpen: boolean
}

export default function Sidebar({ isOpen }: Props) {
    const [active, setActive] = useState<'participants'|'settings'|'theme'>('participants')

    return (
        <aside
            className={`
        flex-shrink-0 w-64 bg-[#2b2e36] text-white
        transform transition-transform duration-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        >
            <nav className="flex flex-col border-b border-[#444956]">
                <button
                    className={`p-4 text-left hover:bg-[#3a3f49] ${active==='participants'?'bg-[#3a3f49]':''}`}
                    onClick={()=>setActive('participants')}
                >👥 Katılımcılar</button>
                <button
                    className={`p-4 text-left hover:bg-[#3a3f49] ${active==='settings'?'bg-[#3a3f49]':''}`}
                    onClick={()=>setActive('settings')}
                >⚙️ Ayarlar</button>
                <button
                    className={`p-4 text-left hover:bg-[#3a3f49] ${active==='theme'?'bg-[#3a3f49]':''}`}
                    onClick={()=>setActive('theme')}
                >🎨 Şablon & Renk</button>
            </nav>

            <div className="p-4 overflow-auto">
                {active === 'participants' && <ParticipantsPanel />}
                {active === 'settings'     && <SettingsPanel />}
                {active === 'theme'        && <ThemePanel />}
            </div>
        </aside>
    )
}
