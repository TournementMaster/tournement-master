import { useBracketTheme, useSetTheme } from '../context/BracketThemeContext'
import { PALETTES, type ThemeKey, type Palette } from '../context/themePalettes'

type Item = { key: 'classic-dark'|'modern-light'|'purple-orange'|'black-white'; label: string; map: ThemeKey }

const ITEMS: Item[] = [
    { key: 'classic-dark',  label: 'Klasik',       map: 'classic' },
    { key: 'modern-light',  label: 'Mor',          map: 'purple'  },
    { key: 'purple-orange', label: 'Turuncu',      map: 'orange'  },
    { key: 'black-white',   label: 'Siyah–Beyaz',  map: 'invert'  },
]

export default function ThemePanel() {
    const theme = useBracketTheme()
    const setTheme = useSetTheme()

    const preview = (p: Palette) => (
        <span
            className="inline-block w-6 h-6 rounded border border-white/20 mr-2 align-middle"
            style={{
                background: `linear-gradient(135deg, ${p.bg} 60%, ${p.win} 100%)`
            }}
        />
    )

    return (
        <aside className="space-y-2">
            <h3 className="font-semibold mb-2">Şablon & Renk</h3>
            {ITEMS.map(it => {
                const pal = PALETTES[it.map]
                const active = theme === it.key
                return (
                    <button
                        key={it.key}
                        onClick={() => setTheme(it.key as any)}
                        className={`block w-full text-left px-3 py-2 rounded transition ${
                            active ? 'bg-teal-400 text-black' : 'hover:bg-gray-700'
                        }`}
                    >
                        {preview(pal)} {it.label}
                    </button>
                )
            })}
        </aside>
    )
}
