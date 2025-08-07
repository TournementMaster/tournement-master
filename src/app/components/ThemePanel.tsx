import { useBracketTheme, useSetTheme } from '../context/BracketThemeContext'

const THEMES: { key: string; label: string }[] = [
    { key: 'classic-dark',  label: 'Klasik (Koyu)' },
    { key: 'classic-light', label: 'Klasik (Açık)' },
    { key: 'modern-dark',   label: 'Modern (Koyu)' },
    { key: 'modern-light',  label: 'Modern (Açık)' },
    { key: 'purple-orange', label: 'Mor – Turuncu' },
    { key: 'black-white',   label: 'Siyah – Beyaz' },
]

export default function ThemePanel() {
    const theme = useBracketTheme()
    const setTheme = useSetTheme()

    return (
        <aside className="space-y-2">
            <h3 className="font-semibold mb-2">Şablon & Renk</h3>
            {THEMES.map(t => (
                <button
                    key={t.key}
                    onClick={() => setTheme(t.key as any)}
                    className={`
            block w-full text-left px-3 py-2 rounded
            ${theme === t.key ? 'bg-teal-400 text-black' : 'hover:bg-gray-700'}
            transition
          `}
                >
                    {t.label}
                </button>
            ))}
        </aside>
    )
}
