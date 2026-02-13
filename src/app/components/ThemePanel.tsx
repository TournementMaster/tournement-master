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
        (settings && settings.labelLayout === 'classic') ? 'classic' : 'stacked';

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
        <aside className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">Şablon & Renk</h3>
            <div className="grid grid-cols-1 gap-2">
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
                            className={[
                                'block w-full text-left px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors',
                                'bg-black/20 border',
                                active
                                    ? 'border-premium-accent/55 text-white'
                                    : 'border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-black/25',
                            ].join(' ')}
                        >
                            {preview(key)} {it.label}
                        </button>
                    )
                })}
            </div>

            <div className="h-px bg-white/10 my-3" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">Etiket düzeni</h3>
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => set({ labelLayout: 'classic' })}
                    className={[
                        'block w-full text-left px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors',
                        'bg-black/20 border',
                        labelLayout==='classic'
                            ? 'border-premium-accent/55 text-white'
                            : 'border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-black/25',
                    ].join(' ')}
                >
                    Klasik — tek satır (kısalt)
                </button>
                <button
                    onClick={() => set({ labelLayout: 'stacked' })}
                    className={[
                        'block w-full text-left px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors',
                        'bg-black/20 border',
                        labelLayout==='stacked'
                            ? 'border-premium-accent/55 text-white'
                            : 'border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-black/25',
                    ].join(' ')}
                >
                    İsim üstte, kulüp altta — tam genişlik
                </button>
            </div>
        </aside>
    )
}
