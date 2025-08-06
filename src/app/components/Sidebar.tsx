import { useLocation } from 'react-router-dom';
import { useSetTheme } from '../context/BracketThemeContext';
import type { ThemeKey } from '../context/BracketThemeContext';

const THEMES: { key: ThemeKey; label: string }[] = [
    { key: 'orange',  label: 'Turuncu' },
    { key: 'purple',  label: 'Mor'     },
];

export default function Sidebar() {
    const { pathname } = useLocation();
    const setTheme     = useSetTheme();

    /* Bracket oluştur sayfalarında sticky */
    const sticky = pathname.startsWith('/create') || pathname.startsWith('/bracket');

    /* Sekme durumu (state tutmak yerine :target anchor) */
    const tab =
        pathname.includes('/participants') ? 'team' :
            pathname.includes('/theme')        ? 'theme' :
                pathname.includes('/settings')     ? 'gear'  : 'info';

    return (
        <aside
            className={`w-56 bg-[#2d3038] shadow-lg flex flex-col
                  ${sticky ? 'md:sticky top-24' : ''}`}
        >
            {/* -------- Sekme butonları -------- */}
            <nav className="flex">
                <SidebarTab icon="𐄷" href="#info"     active={tab==='info'} />
                <SidebarTab icon="👥" href="#team"     active={tab==='team'} />
                <SidebarTab icon="🎨" href="#theme"    active={tab==='theme'} />
                <SidebarTab icon="⚙️" href="#settings" active={tab==='gear'} />
            </nav>

            {/* -------- Paneller -------- */}
            <div className="flex-1 overflow-auto">
                {/* Bracket Info */}
                {tab==='info' && (
                    <Panel title="BRACKET INFORMATION">
                        {/* … kendi form alanlarınız … */}
                        <p className="text-sm text-gray-400">Bilgileri buraya ekleyin.</p>
                    </Panel>
                )}

                {/* Katılımcılar */}
                {tab==='team' && (
                    <Panel title="PARTICIPANTS">
                        {/* Katılımcı listesi vs. */}
                        <p className="text-sm text-gray-400">Katılımcı ekranı burada.</p>
                    </Panel>
                )}

                {/* Tema seçimi */}
                {tab==='theme' && (
                    <Panel title="THEME">
                        <ul className="mt-4 space-y-1">
                            {THEMES.map(t=>(
                                <li key={t.key}>
                                    <button
                                        onClick={()=>setTheme(t.key)}
                                        className="w-full px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-3"
                                    >
                    <span className="w-6 h-6 rounded-full"
                          style={{background:t.key==='orange'?'#ff7b00':'#7c3aed'}}/>
                                        {t.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}

                {/* Ayarlar */}
                {tab==='gear' && (
                    <Panel title="DISPLAY SETTINGS">
                        {/* örnek toggle */}
                        <label className="flex items-center justify-between px-3 py-2">
                            Show Seeds
                            <input type="checkbox" defaultChecked className="toggle" />
                        </label>
                    </Panel>
                )}
            </div>
        </aside>
    );
}

/* --- Küçük yardımcı bileşenler --- */
function SidebarTab({ icon, href, active }:{icon:string;href:string;active:boolean}) {
    return (
        <a
            href={href}
            className={`flex-1 text-center py-3 text-2xl
                  ${active?'bg-[#3a3d46]':'hover:bg-[#34363e]'}`}
        >
            {icon}
        </a>
    );
}

function Panel({ title, children }:{title:string;children:React.ReactNode}) {
    return (
        <div className="px-4 py-5">
            <h3 className="text-xs text-gray-400 font-semibold mb-3">{title}</h3>
            {children}
        </div>
    );
}
