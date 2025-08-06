import { Link, useLocation } from 'react-router-dom';
import { useSetTheme } from '../context/BracketThemeContext';
import type { ThemeKey } from '../context/BracketThemeContext';

interface Props { open: boolean; toggle: () => void; }

/* Tema seçenekleri listesi (Türkçe) */
const TEMALAR: { key: ThemeKey; label: string }[] = [
    { key: 'blue-green',  label: 'Mavi / Yeşil' },
    { key: 'light-green', label: 'Açık Yeşil'   },
    { key: 'classic',     label: 'Siyah / Beyaz'},
    { key: 'orange',      label: 'Turuncu / Kahve'},
];

export default function Sidebar({ open, toggle }: Props) {
    const { pathname } = useLocation();
    const setTheme     = useSetTheme();

    /* Sadece /create yolunda tema paneli göster */
    const showTheme = pathname.startsWith('/create');

    return (
        <aside
            className={`${
                open ? 'w-56' : 'w-0 md:w-16'
            } transition-all duration-200 bg-[#2d3038] overflow-hidden shadow-lg`}
        >
            {/* Başlık/kapama */}
            <div className="flex items-center justify-between h-12 px-4 md:justify-center">
                <span className={`${open ? 'block' : 'hidden md:block'} font-semibold`}>Menü</span>
                <button
                    onClick={toggle}
                    className={`${open ? 'block' : 'hidden md:block'} text-gray-400`}
                >
                    ⨯
                </button>
            </div>

            {/* Ana bağlantılar */}
            <nav className="flex flex-col gap-1 mt-4">
                <Link
                    to="/"
                    className="mx-3 px-3 py-2 rounded hover:bg-gray-700 text-sm"
                >
                    Turnuvalarım
                </Link>
            </nav>

            {/* Tema paneli */}
            {showTheme && (
                <div className="mt-6 border-t border-white/10 pt-4 px-3 pb-6">
                    <h3 className="text-sm font-semibold mb-2 text-gray-200">Tema Seç</h3>
                    <ul className="space-y-1">
                        {TEMALAR.map(t => (
                            <li key={t.key}>
                                <button
                                    onClick={() => setTheme(t.key)}
                                    className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 text-sm"
                                >
                                    {t.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </aside>
    );
}
