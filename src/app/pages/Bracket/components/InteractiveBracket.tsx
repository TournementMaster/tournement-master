// src/app/pages/Bracket/components/InteractiveBracket.tsx
import { memo, useEffect, useMemo, useState, Fragment } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useBracketTheme } from '../../../context/BracketThemeContext'
import type { BracketThemeKey } from '../../../context/BracketThemeContext'
import { usePlayers } from '../../../context/BracketPlayersCtx'
import { useSettings } from '../../../context/BracketSettingsCtx'
import MatchModal from './MatchModal'

// ThemePalettes'ten
import { PALETTES, type ThemeKey } from '../../../context/themePalettes'

export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   { scores?: [number, number][]; manual?: 0 | 1 }
export interface Match  { players: Player[]; meta?: Meta }
type Matrix = Match[][]

const W = 320, H = 70, GAP = 110, BASE = H, R = 10
type Pos = { mid: number; y1: number; y2: number }

// BracketThemeKey → ThemeKey eşlemesi
const THEME_MAP: Record<BracketThemeKey, ThemeKey> = {
    'classic-dark':  'classic',
    'classic-light': 'classic',
    'modern-dark':   'orange',
    'modern-light':  'orange',
    'purple-orange': 'purple',
    'black-white':   'invert',
}

// Seed düzenleri
const SEEDS: Record<4|8|16|32, number[]> = {
    4 : [1,4,2,3],
    8 : [1,8,4,5,3,6,2,7],
    16: [1,16,8,9,5,12,4,13,6,11,3,14,7,10,2,15],
    32: [1,32,16,17,8,25,9,24,5,28,12,21,4,29,13,20,
        6,27,11,22,3,30,14,19,7,26,10,23,2,31,15,18],
}

const blank = (): Match => ({
    players: [{ seed: 0, name: '?' }, { seed: 0, name: '?' }]
})

function buildMatrix(names: string[], full16: boolean): Matrix {
    let size: 4|8|16|32 = 4
    const need = full16
        ? 16
        : Math.max(4, 2 ** Math.ceil(Math.log2(Math.max(1, names.length))))
    if      (need <= 4)  size = 4
    else if (need <= 8)  size = 8
    else if (need <= 16) size = 16
    else                 size = 32

    const seeds = SEEDS[size]
    const r0: Match[] = Array(size/2).fill(0).map((_, i) => ({
        players: [
            { seed: seeds[i*2],   name: names[i*2]   ?? `Takım ${seeds[i*2]}` },
            { seed: seeds[i*2+1], name: names[i*2+1] ?? `Takım ${seeds[i*2+1]}` },
        ],
    }))

    const rounds: Matrix = [r0]
    let games = size / 4
    while (games >= 1) {
        rounds.push(Array(games).fill(0).map(blank))
        games /= 2
    }
    return rounds
}

function propagate(mat: Matrix): Matrix {
    const m = mat.map(rd => rd.map(x => ({
        ...x,
        players: x.players.map(p => ({ ...p }))
    })))
    for (let r = 0; r < m.length - 1; r++) {
        m[r].forEach((match, idx) => {
            const [a = 0, b = 0] = match.meta?.scores?.[0] ?? []
            const auto = a !== b ? (a > b ? 0 : 1) : undefined
            const win  = match.meta?.manual ?? auto
            match.players.forEach((p,i) => p.winner = win === i)
            if (win !== undefined) {
                m[r+1][Math.floor(idx/2)].players[idx%2] = { ...match.players[win] }
            }
        })
    }
    return m
}

export default memo(function InteractiveBracket() {
    const { players }  = usePlayers()
    const { settings } = useSettings()

    // Context'ten gelen BracketThemeKey
    const bracketKey = useBracketTheme()
    // Gerçek ThemeKey'e dönüştür
    const themeKey   = THEME_MAP[bracketKey]
    // Ve palette objesini al
    const palette    = PALETTES[themeKey]

    const make = () => propagate(buildMatrix(players, settings.double))
    const [rounds, setRounds] = useState<Matrix>(make)
    const [sel, setSel]       = useState<{ r: number; m: number } | null>(null)

    useEffect(() => setRounds(make()), [players, settings.double])

    const layout: Pos[][] = useMemo(() => rounds.map((rd,r) => {
        const span = BASE << r
        return rd.map((_,m) => {
            const mid = BASE + span + m*span*2
            return { mid, y1: mid - span/2, y2: mid + span/2 }
        })
    }), [rounds])

    const svgH = layout[0].at(-1)!.mid + BASE
    const svgW = 20 + rounds.length*(W+GAP) + 150

    const saveMeta = (meta: Meta) => {
        if (!sel) return
        setRounds(prev => {
            const c = prev.map(rd => rd.map(m => ({ ...m })))
            c[sel.r][sel.m] = { ...c[sel.r][sel.m], meta }
            return propagate(c)
        })
        setSel(null)
    }

    return (
        <div className="relative">
            <TransformWrapper wheel={{ step:120 }} minScale={0.5} maxScale={3.5}>
                <TransformComponent wrapperClass="min-w-fit">
                    <svg width={svgW} height={svgH}>
                        <defs>
                            <style>{`
                .rect    { fill: ${palette.bg} }
                .bar     { fill: ${palette.bar} }
                .mid     { stroke: ${palette.bar}; stroke-width:1.4 }
                .ln      { stroke:white; stroke-width:1.4; vector-effect:non-scaling-stroke }
                .txt     { font:600 18px/1 Inter,sans-serif; fill:${palette.txt}; dominant-baseline:middle }
                .win     { fill:${palette.win} }
                .outline { stroke:url(#g); fill:none; stroke-width:0 }
                .hit:hover + .outline { stroke-width:4; filter:drop-shadow(0 0 8px ${palette.glow2}) }
              `}</style>
                            <linearGradient id="g" x1="0" x2="1">
                                <stop offset="0%" stopColor={palette.glow1}/>
                                <stop offset="100%" stopColor={palette.glow2}/>
                            </linearGradient>
                        </defs>

                        {rounds.map((rd,r) => {
                            const x  = 20 + r*(W+GAP)
                            const nx = x + W + GAP
                            return rd.map((m,i) => {
                                const { mid, y1, y2 } = layout[r][i]
                                const score = m.meta?.scores?.[0]
                                return (
                                    <g key={`${r}-${i}`}>
                                        <rect className="rect" x={x} y={mid-H/2} width={W} height={H} rx={R}/>
                                        <rect className="bar"  x={x-8} y={mid-H/2} width={8} height={H} rx={R}/>
                                        {m.players.find(p=>p.winner) && (
                                            <rect className="win" x={x+W} y={mid-H/2} width={8} height={H} rx={R}/>
                                        )}
                                        <line className="mid" x1={x} x2={x+W} y1={mid} y2={mid}/>

                                        {m.players.map((p,idx) => (
                                            <Fragment key={idx}>
                                                <text className="txt" x={x+18} y={mid + (idx ? 22 : -22)}>
                                                    {p.name}
                                                </text>
                                                {settings.showScores && score && (
                                                    <text className="txt" fontSize={14} fill="#fff"
                                                          x={x+W-28} y={mid + (idx?22:-22)} textAnchor="end">
                                                        {score[idx]}
                                                    </text>
                                                )}
                                            </Fragment>
                                        ))}

                                        <line className="ln" x1={x-8} y1={y1} x2={x-8} y2={y2}/>
                                        <line className="ln" x1={x-8} y1={mid} x2={x}   y2={mid}/>
                                        {r < rounds.length-1 && (
                                            <line className="ln" x1={x+W+8} y1={mid} x2={nx-8} y2={mid}/>
                                        )}

                                        <rect className="hit" x={x} y={mid-H/2} width={W} height={H}
                                              fill="transparent" onClick={()=>setSel({ r, m: i })}/>
                                        <rect className="outline" x={x-8} y={mid-H/2} width={W+16} height={H} rx={R+2}/>
                                    </g>
                                )
                            })
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {sel && (
                <MatchModal
                    match={rounds[sel.r][sel.m]}
                    onSave={saveMeta}
                    onClose={() => setSel(null)}
                />
            )}
        </div>
    )
})
