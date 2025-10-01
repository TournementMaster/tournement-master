import { useBracketTheme, useSetTheme, type BracketThemeKey } from '../context/BracketThemeContext'
import { useSettings } from '../context/BracketSettingsCtx'
import { PALETTES } from '../context/themePalettes'

type Item = { key: BracketThemeKey; label: string; map?: string }

const ITEMS: Item[] = [
    { key:'classic-dark',  label:'Klasik' },
    { key:'modern-light',  label:'Mor'    },
    { key:'purple-orange', label:'Turuncu'},
    { key:'black-white',   label:'Siyah–Beyaz' },
    // yeniler
    { key:'ocean',   label:'Okyanus Mavisi'   },
    { key:'forest',  label:'Orman Yeşili'  },
    { key:'rose',    label:'Gül Kırmızısı'    },
    { key:'gold',    label:'Altın Sarısı'    },
    { key:'crimson', label:'Kızıl Elma' },
    { key:'teal',    label:'Turkuaz'    },
    { key:'slate',   label:'Füme'   },
]

export default function ThemePanel() {
    const theme = useBracketTheme()
    const setTheme = useSetTheme()
    const { settings, set } = useSettings()
    const labelLayout: 'classic' | 'stacked' =
        (settings as any)?.labelLayout === 'stacked' ? 'stacked' : 'classic'

    const preview = (k: keyof typeof PALETTES) => {
        const p = PALETTES[k]
        return (
            <span
                className="inline-block w-6 h-6 rounded border border-white/20 mr-2 align-middle"
                style={{ background: `linear-gradient(135deg, ${p.bg} 60%, ${p.win} 100%)` }}
            />
        )
    }

    return (
        <aside className="space-y-2">
            <h3 className="font-semibold mb-2">Şablon & Renk</h3>
            {ITEMS.map(it => {
                // PALETTES anahtarı çöz
                const key =
                    it.key==='classic-dark'||it.key==='classic-light' ? 'classic' :
                        it.key==='modern-light'||it.key==='modern-dark'  ? 'purple'  :
                            it.key==='purple-orange' ? 'orange' :
                                it.key==='black-white'   ? 'invert' :
                                    (it.key as keyof typeof PALETTES)

                const active = theme === it.key
                return (
                    <button
                        key={it.key}
                        onClick={() => setTheme(it.key)}
                        className={`block w-full text-left px-3 py-2 rounded transition
              ${active ? 'bg-teal-400 text-black' : 'hover:bg-gray-700'}`}
                    >
                        {preview(key)} {it.label}
                    </button>
                )
            })}

            <div className="h-px bg-white/10 my-3" />
            <h3 className="font-semibold mb-2">Etiket Düzeni</h3>
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => set({ labelLayout: 'classic' })}
                    className={`px-3 py-2 rounded ${labelLayout==='classic' ? 'bg-teal-400 text-black' : 'hover:bg-gray-700'}`}
                >
                    Klasik — tek satır (kısalt)
                </button>
                <button
                    onClick={() => set({ labelLayout: 'stacked' })}
                    className={`px-3 py-2 rounded ${labelLayout==='stacked' ? 'bg-teal-400 text-black' : 'hover:bg-gray-700'}`}
                >
                    İsim üstte, kulüp altta — tam genişlik
                </button>
            </div>
        </aside>
    )
}
