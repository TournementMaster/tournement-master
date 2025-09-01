import { useEffect, useRef, useState } from 'react'
import ParticipantsPanel from './ParticipantsPanel'
import SettingsPanel from './SettingsPanel'
import ThemePanel from './ThemePanel'
import SubTournamentSettingsPanel from './SubTournamentSettingsPanel'
import { useAuth } from '../context/useAuth'
import { usePlayers } from '../hooks/usePlayers'

interface Props { isOpen: boolean; onToggle: () => void }

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
    )
}

const PATH = {
    chevronL: 'M15 18L9 12l6-6',
    users:
        'M14 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H8.2A4.2 4.2 0 0 0 4 19.2V21 M10 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M20 21v-1.4a3.4 3.4 0 0 0-3.4-3.4h-1.2 M19 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
    info: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z M12 16v-4 M12 8h.01',
    cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a2 2 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.64.3 1.09.94 1.09 1.69S20.04 14.7 19.4 15z',
    palette: 'M12 22a10 10 0 1 1 10-10c0 3-2.5 3-4 3h-1a3 3 0 0 0-3 3v1 M7 10h.01 M12 7h.01 M17 10h.01',
    fullscreen: 'M4 4h6v2H6v4H4z M20 20h-6v-2h4v-4h2z',
    sheet:
        'M8 3h5l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M13 3v5h5 M8 12h8 M8 16h8 M8 20h8',
}

function IconButton({
                        title,
                        active,
                        onClick,
                        children,
                    }: {
    title: string
    active?: boolean
    onClick: () => void
    children: React.ReactNode
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
    )
}

export default function Sidebar({ isOpen, onToggle }: Props) {
    const { isAuth } = useAuth()
    const { setPlayers } = usePlayers()
    const [active, setActive] = useState<'participants' | 'sub' | 'settings' | 'theme'>(isAuth ? 'participants' : 'theme')
    const [full, setFull] = useState(false)
    const [paletteOnly, setPaletteOnly] = useState(false)

    const [isReferee, setIsReferee] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    // İlk mount'ta globale bak
    useEffect(() => {
        const g = (window as any).__bracketState;
        if (g) { setIsReferee(!!g.isReferee); setCanEdit(!!g.canEdit); }
    }, []);
    // Canlı role event'i
    useEffect(() => {
        const h = (e:any) => { setIsReferee(!!e?.detail?.isReferee); setCanEdit(!!e?.detail?.canEdit); };
        window.addEventListener('bracket:role', h);
        return () => window.removeEventListener('bracket:role', h);
    }, []);
    const hideSettings = isReferee && !canEdit;

    useEffect(() => {
        if (!isAuth) setActive('theme')
    }, [isAuth])

    useEffect(() => {
        const h = (e: any) => setPaletteOnly(Boolean(e?.detail?.value))
        window.addEventListener('bracket:palette-only', h)
        return () => window.removeEventListener('bracket:palette-only', h)
    }, [])
    useEffect(() => {
        if (paletteOnly) setActive('theme')
    }, [paletteOnly])

    const ensureOpen = () => {
        if (!isOpen) onToggle();
        const g = (window as any).__bracketState;
        if (g) { setIsReferee(!!g.isReferee); setCanEdit(!!g.canEdit); }
    };

    // Excel import
    const fileRef = useRef<HTMLInputElement | null>(null)
    const triggerImport = () => {
        if (isAuth) fileRef.current?.click()
    }
    const onFile = async (f?: File | null) => {
        if (!f) return
        try {
            const XLSX = await import('xlsx')
            const buf = await f.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
            const out = rows
                .map((r, i) => ({
                    name: String(r?.[0] ?? '').trim(),
                    club: String(r?.[1] ?? '').trim() || undefined,
                    seed: i + 1,
                }))
                .filter((x) => x.name)
            if (!out.length) {
                alert('Dosyada sporcu bulunamadı (A sütunu ad, B sütunu kulüp).')
                return
            }
            setPlayers(out)
            window.dispatchEvent(new CustomEvent('layout:sidebar-toggle'))
        } catch (e) {
            console.error(e)
            alert('Import için "xlsx" paketi gerekli veya dosya okunamadı.')
        } finally {
            if (fileRef.current) fileRef.current.value = ''
        }
    }

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
        )
    }

    return (
        <>
            {/* ===== DESKTOP (md↑): sol dikey nav + yan panel ===== */}
            <div className="hidden md:flex">
                {/* Sol nav (dikey) */}
                <nav
                    className="
          relative z-40
          flex md:flex-col items-center
          md:w-16 md:h-auto
          px-0 py-3
          bg-[#222831] text-white
          shadow-[inset_-1px_0_0_0_rgba(255,255,255,.06)]
        "
                >
                    {/* Aç/Kapat */}
                    <button
                        onClick={onToggle}
                        title={isOpen ? 'Sidebari kapat' : 'Sidebari aç'}
                        className="mb-4 w-12 h-12 flex items-center justify-center rounded-full border border-white/25 hover:bg-white/10 focus:outline-none transition shrink-0"
                    >
                        <Icon d={PATH.chevronL} className={`w-7 h-7 transition ${isOpen ? '' : 'rotate-180'}`} />
                    </button>

                    {/* İkonlar (desktop) */}
                    <div className="flex-none flex md:flex-col gap-4">
                        {isAuth && !paletteOnly && (
                            <>
                                <IconButton title="Katılımcılar" active={active==='participants'} onClick={()=>{ if(!isOpen) onToggle(); setActive('participants'); }}>
                                    <Icon d={PATH.users}/>
                                </IconButton>

                                <IconButton title="Alt Turnuva Bilgileri" active={active==='sub'} onClick={()=>{ if(!isOpen) onToggle(); setActive('sub'); }}>
                                    <Icon d={PATH.info}/>
                                </IconButton>

                                {!hideSettings && (
                                    <IconButton title="Ayarlar" active={active==='settings'} onClick={()=>{ if(!isOpen) onToggle(); setActive('settings'); }}>
                                        <Icon d={PATH.cog}/>
                                    </IconButton>
                                )}

                                <IconButton title="Excel'den içe aktar" onClick={()=>{ if(!isOpen) onToggle(); triggerImport(); }}>
                                    <Icon d={PATH.sheet}/>
                                </IconButton>
                                <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e)=>onFile(e.target.files?.[0] ?? null)} />
                            </>
                        )}

                        {/* Tema her zaman açık */}
                        <IconButton title="Şablon & Renk" active={active==='theme'} onClick={()=>{ if(!isOpen) onToggle(); setActive('theme'); }}>
                            <Icon d={PATH.palette}/>
                        </IconButton>
                    </div>

                    {/* Tam ekran */}
                    <div className="mt-auto">
                        <IconButton title="Tam ekran" onClick={()=>setFull(true)}>
                            <Icon d={PATH.fullscreen}/>
                        </IconButton>
                    </div>
                </nav>

                {/* Panel (desktop’ta sol yanında) */}
                {isOpen && (
                    <div
                        className="
            bg-[#2a303a] text-slate-100 p-4
            md:w-72
            md:h-[calc(100vh-64px)]
            overflow-hidden
          "
                    >
                        <div className="h-full overflow-y-auto">
                            {paletteOnly || !isAuth ? (
                                <ThemePanel />
                            ) : (
                                <>
                                    {active==='participants' && <ParticipantsPanel />}
                                    {active==='sub' && <SubTournamentSettingsPanel />}
                                    {active==='settings' && <SettingsPanel />}
                                    {active==='theme' && <ThemePanel />}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ===== MOBILE (below md): bottom nav + bottom drawer panel ===== */}

            {/* Panel açıkken karartma */}
            {isOpen && (
                <div className="md:hidden fixed inset-0 bg-black/60 z-[85]" onClick={onToggle} />
            )}

            {/* Bottom drawer panel (alt barda 56px yer bırak) */}
            {isOpen && (
                <div
                    className="
          md:hidden fixed left-0 right-0 bottom-14  /* alt bar yüksekliği kadar yukarıda */
          z-[90]
          bg-[#2a303a] text-slate-100 p-4
          rounded-t-2xl border-t border-white/10
          h-[70vh] pb-[calc(env(safe-area-inset-bottom)+12px)]
          overflow-hidden shadow-2xl
        "
                >
                    <div className="h-full overflow-y-auto">
                        {paletteOnly || !isAuth ? (
                            <ThemePanel />
                        ) : (
                            <>
                                {active==='participants' && <ParticipantsPanel />}
                                {active==='sub' && <SubTournamentSettingsPanel />}
                                {active==='settings' && <SettingsPanel />}
                                {active==='theme' && <ThemePanel />}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom navigation bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 z-[80] bg-[#222831] text-white border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
                <div className="h-full flex items-center justify-between px-2 overflow-x-auto gap-1">
                    <button
                        onClick={onToggle}
                        title={isOpen ? 'Paneli kapat' : 'Paneli aç'}
                        className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20"
                    >
                        <Icon d={PATH.chevronL} className={`w-6 h-6 ${isOpen ? '' : 'rotate-180'}`} />
                    </button>

                    {isAuth && !paletteOnly && (
                        <>
                            <IconButton title="Katılımcılar" active={active==='participants'} onClick={()=>{ if(!isOpen) onToggle(); setActive('participants'); }}><Icon d={PATH.users}/></IconButton>
                            <IconButton title="Alt Turnuva"   active={active==='sub'}          onClick={()=>{ if(!isOpen) onToggle(); setActive('sub'); }}><Icon d={PATH.info}/></IconButton>
                            {!hideSettings && (
                                <IconButton title="Ayarlar" active={active==='settings'} onClick={()=>{ if(!isOpen) onToggle(); setActive('settings'); }}>
                                    <Icon d={PATH.cog}/>
                                </IconButton>
                            )}
                            <IconButton title="Excel içe aktar" onClick={()=>{ if(!isOpen) onToggle(); triggerImport(); }}><Icon d={PATH.sheet}/></IconButton>
                            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e)=>onFile(e.target.files?.[0] ?? null)} />
                        </>
                    )}

                    <IconButton title="Tema" active={active==='theme'} onClick={()=>{ if(!isOpen) onToggle(); setActive('theme'); }}>
                        <Icon d={PATH.palette}/>
                    </IconButton>
                </div>
            </nav>
        </>
    );

}
