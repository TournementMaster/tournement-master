import { useEffect, useState } from 'react';
import ParticipantsPanel from './ParticipantsPanel';
import SettingsPanel from './SettingsPanel';
import ThemePanel from './ThemePanel';
import SubTournamentSettingsPanel from './SubTournamentSettingsPanel';
import { useAuth } from '../context/useAuth';

interface Props {
    isOpen: boolean;
    onToggle: () => void;
}

function Icon({ d, className = 'w-8 h-8' }: { d: string; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d={d} />
        </svg>
    );
}

const PATH = {
    chevronL: 'M15 18L9 12l6-6',
    users:
        'M14 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H8.2A4.2 4.2 0 0 0 4 19.2V21 M10 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M20 21v-1.4a3.4 3.4 0 0 0-3.4-3.4h-1.2 M19 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
    info:
        'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z M12 16v-4 M12 8h.01',
    cog:
        'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a2 2 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.64.3 1.09.94 1.09 1.69S20.04 14.7 19.4 15z',
    palette:
        'M12 22a10 10 0 1 1 10-10c0 3-2.5 3-4 3h-1a3 3 0 0 0-3 3v1 M7 10h.01 M12 7h.01 M17 10h.01',
    fullscreen: 'M4 4h6v2H6v4H4z M20 20h-6v-2h4v-4h2z',
};

function IconButton({
                        title,
                        active,
                        onClick,
                        children,
                    }: {
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={[
                'w-12 h-12 flex items-center justify-center rounded-full transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                active
                    ? 'text-teal-300 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,.12)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

export default function Sidebar({ isOpen, onToggle }: Props) {
    const { isAuth } = useAuth();
    const [active, setActive] = useState<
        'participants' | 'sub' | 'settings' | 'theme'
    >(isAuth ? 'participants' : 'theme');
    const [full, setFull] = useState(false);

    useEffect(() => {
        if (!isAuth) setActive('theme');
    }, [isAuth]);

    const ensureOpen = () => {
        if (!isOpen) onToggle();
    };

    if (full) {
        return (
            <>
                <button
                    onClick={() => setFull(false)}
                    className="fixed bottom-3 left-3 z-[60] w-12 h-12 rounded-full border border-white/25 text-white bg-[#0f1217]/95 hover:bg-[#0f1217] focus:outline-none"
                    title="Tam ekrandan çık"
                >
                    <Icon d={PATH.chevronL} />
                </button>
            </>
        );
    }

    return (
        <div className="flex">
            <nav
                className="
          relative z-40 flex flex-col items-center
          w-16 py-3
          bg-[#222831]
          text-white
          shadow-[inset_-1px_0_0_0_rgba(255,255,255,.06)]
        "
            >
                <button
                    onClick={onToggle}
                    title={isOpen ? 'Sidebari kapat' : 'Sidebari aç'}
                    className="mb-4 w-12 h-12 flex items-center justify-center rounded-full border border-white/25 hover:bg-white/10 focus:outline-none transition"
                >
                    <Icon
                        d={PATH.chevronL}
                        className={`w-7 h-7 transition ${isOpen ? '' : 'rotate-180'}`}
                    />
                </button>

                <div className="flex flex-col items-center gap-4">
                    {isAuth && (
                        <>
                            <IconButton
                                title="Katılımcılar"
                                active={active === 'participants'}
                                onClick={() => {
                                    ensureOpen();
                                    setActive('participants');
                                }}
                            >
                                <Icon d={PATH.users} />
                            </IconButton>

                            <IconButton
                                title="Alt Turnuva Bilgileri"
                                active={active === 'sub'}
                                onClick={() => {
                                    ensureOpen();
                                    setActive('sub');
                                }}
                            >
                                <Icon d={PATH.info} />
                            </IconButton>

                            <IconButton
                                title="Ayarlar"
                                active={active === 'settings'}
                                onClick={() => {
                                    ensureOpen();
                                    setActive('settings');
                                }}
                            >
                                <Icon d={PATH.cog} />
                            </IconButton>
                        </>
                    )}

                    {/* Tema her zaman açık */}
                    <IconButton
                        title="Şablon & Renk"
                        active={active === 'theme'}
                        onClick={() => {
                            ensureOpen();
                            setActive('theme');
                        }}
                    >
                        <Icon d={PATH.palette} />
                    </IconButton>
                </div>

                <div className="mt-auto">
                    <IconButton title="Tam ekran" onClick={() => setFull(true)}>
                        <Icon d={PATH.fullscreen} />
                    </IconButton>
                </div>
            </nav>

            {isOpen && (
                <div className="bg-[#2a303a] text-slate-100 p-4 w-72 z-30">
                    {!isAuth ? (
                        <ThemePanel />
                    ) : (
                        <>
                            {active === 'participants' && <ParticipantsPanel />}
                            {active === 'sub' && <SubTournamentSettingsPanel />}
                            {active === 'settings' && <SettingsPanel />}
                            {active === 'theme' && <ThemePanel />}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
