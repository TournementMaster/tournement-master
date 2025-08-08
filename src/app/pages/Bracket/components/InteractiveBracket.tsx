// src/app/pages/Bracket/components/InteractiveBracket.tsx
import { memo, useEffect, useMemo, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import MatchModal from './MatchModal'
import { useBracketTheme, type BracketThemeKey } from '../../../context/BracketThemeContext'
import { PALETTES, type ThemeKey, type Palette } from '../../../context/themePalettes'
import { usePlayers } from '../../../hooks/usePlayers'
import { useSettings } from '../../../context/BracketSettingsCtx'

/* ------------------------------------------------------------------ */
export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   { scores?: [number, number][]; manual?: 0 | 1 }
export interface Match  { players: Player[]; meta?: Meta }
type Matrix = Match[][]

const BOX_W   = 320
const BOX_H   = 70
const GAP     = 110
const BASE    = BOX_H
const CORNER  = 10
type Pos = { mid: number; y1: number; y2: number }

/* Seed yerleşimi */
const SEEDS: Record<4|8|16|32, number[]> = {
    4:  [1, 4, 3, 2],
    8:  [1, 8, 5, 4, 3, 6, 7, 2],
    16: [1,16, 9, 8, 5,12,13, 4, 3,14,11, 6, 7,10,15, 2],
    32: [1,32,17,16, 9,24,25, 8, 5,28,21,12,13,20,29, 4,
        3,30,19,14,11,22,27, 6, 7,26,23,10,15,18,31, 2],
}

/* Boş maç */
function blank(): Match {
    return { players: [{ seed: 0, name: '?' }, { seed: 0, name: '?' }] }
}

/* Bracket matrisi */
function buildMatrix(names: string[]): Matrix {
    const n = Math.max(0, names.length)

    let size: 4 | 8 | 16 | 32
    if (n <= 4) size = 4
    else if (n <= 8) size = 8
    else if (n <= 16) size = 16
    else size = 32

    const order = SEEDS[size]
    const r0: Match[] = []

    for (let i = 0; i < size / 2; i++) {
        const sA = order[i * 2]
        const sB = order[i * 2 + 1]
        const nameA = sA <= n ? names[sA - 1] : undefined
        const nameB = sB <= n ? names[sB - 1] : undefined

        const players: Player[] = [
            { seed: sA, name: nameA ?? '—' },
            { seed: sB, name: nameB ?? '—' },
        ]

        // Bye sadece ilk turda otomatik geçsin
        let meta: Meta | undefined
        if (nameA && !nameB) meta = { manual: 0 }
        else if (!nameA && nameB) meta = { manual: 1 }

        r0.push(meta ? { players, meta } : { players })
    }

    const rounds: Matrix = [r0]
    let games = size / 4
    while (games >= 1) {
        rounds.push(Array(games).fill(0).map(blank))
        games /= 2
    }
    return rounds
}

/* Kazananı bir sonraki tura taşı */
function propagate(matrix: Matrix): Matrix {
    // Derin kopya – winner’ı bilinçli olarak eklemiyoruz
    const mat: Matrix = matrix.map(round =>
        round.map(m => ({
            players: m.players.map(p => ({ seed: p.seed, name: p.name } as Player)),
            meta: m.meta ? { scores: m.meta.scores ? [...m.meta.scores] as [number,number][] : undefined, manual: m.meta.manual } : undefined,
        }))
    )

    for (let r = 0; r < mat.length - 1; r++) {
        mat[r].forEach((m, idx) => {
            const [p1, p2] = m.players
            let winner: 0 | 1 | undefined

            // Bye sadece ilk turda
            if (r === 0) {
                const aIsBye = p1.seed === 0 || p1.name === '?'
                const bIsBye = p2.seed === 0 || p2.name === '?'
                if (aIsBye && !bIsBye) winner = 1
                else if (bIsBye && !aIsBye) winner = 0
            }

            // Skorlara bak
            if (winner == null && m.meta?.scores?.length) {
                const [a, b] = m.meta.scores[0]
                if (a !== b) winner = a > b ? 0 : 1
                else if (m.meta.manual != null) winner = m.meta.manual
            }

            if (winner != null) {
                m.players[winner]     = { ...m.players[winner], winner: true }
                m.players[1 - winner] = { ...m.players[1 - winner], winner: false }

                const nextRound = mat[r + 1]
                const nextMatch = nextRound[Math.floor(idx / 2)]
                nextMatch.players[idx % 2] = { ...m.players[winner] }
            }
        })
    }
    return mat
}

/* ------------------------------------------------------------------ */
export default memo(function InteractiveBracket() {
    const { players }  = usePlayers()
    const { settings } = useSettings()
    const themeKey     = useBracketTheme()

    // Sadece gerçek paletlere düşen anahtarlar
    const mapKey: Partial<Record<BracketThemeKey, ThemeKey>> = {
        'classic-dark':  'classic',
        'classic-light': 'classic',
        'modern-light':  'purple',
        'modern-dark':   'purple',
        'purple-orange': 'orange',
        'black-white':   'invert',
    }
    const palette: Palette = PALETTES[(mapKey[themeKey] ?? 'classic') as ThemeKey]

    const [rounds, setRounds] = useState<Matrix>(() => propagate(buildMatrix(players)))
    const [selected, setSelected] = useState<{ r: number; m: number } | null>(null)

    useEffect(() => {
        setRounds(propagate(buildMatrix(players)))
    }, [players, settings.double])

    const layout = useMemo<Pos[][]>(() =>
        rounds.map((round, r) => {
            const span = BASE << r
            return round.map((_, i) => {
                const mid = BASE + span + i * span * 2
                return { mid, y1: mid - span / 2, y2: mid + span / 2 }
            })
        }), [rounds]
    )

    const svgHeight = (layout[0]?.at(-1)?.mid ?? 0) + BASE
    const svgWidth  = 20 + rounds.length * (BOX_W + GAP) + 150

    const saveMeta = (meta: Meta) => {
        if (!selected) return
        setRounds(prev => {
            const copy: Matrix = prev.map(rnd =>
                rnd.map(m => ({
                    players: m.players.map(p => ({ ...p })),
                    meta: m.meta ? { ...m.meta } : undefined
                }))
            )
            copy[selected.r][selected.m].meta = meta
            return propagate(copy)
        })
        setSelected(null)
    }

    return (
        <div className="relative">
            <TransformWrapper wheel={{ step: 120 }} minScale={0.5} maxScale={3.5}>
                <TransformComponent wrapperClass="min-w-fit">
                    <svg width={svgWidth} height={svgHeight}>
                        <defs>
                            <style>{`
                .rect{fill:${palette.bg}}
                .bar {fill:${palette.bar}}
                .mid {stroke:${palette.bar};stroke-width:1.4}
                .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
                .txt {font:600 18px/1 Inter,sans-serif;fill:${palette.txt};dominant-baseline:middle}
                .win {fill:${palette.win}}
                .outline{stroke:url(#g);fill:none;stroke-width:0}
                .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${palette.glow2})}
              `}</style>
                            <linearGradient id="g" x1="0" x2="1">
                                <stop offset="0%" stopColor={palette.glow1}/>
                                <stop offset="100%" stopColor={palette.glow2}/>
                            </linearGradient>
                        </defs>

                        {rounds.map((round, r) => {
                            const x0 = 20 + r * (BOX_W + GAP)
                            const x1 = x0 + BOX_W + GAP

                            return round.map((m, i) => {
                                const { mid, y1, y2 } = layout[r][i]
                                const allSets = m.meta?.scores

                                // set skorlarını metne dönüştür (oyuncu bazlı)
                                const scoreTextFor = (idx: 0 | 1) =>
                                    (allSets ?? []).map(s => String(s[idx] ?? 0)).join('·')

                                return (
                                    <g key={`${r}-${i}`}>
                                        {/* Kutu */}
                                        <rect className="rect" x={x0} y={mid - BOX_H/2} width={BOX_W} height={BOX_H} rx={CORNER}/>
                                        <rect className="bar"  x={x0-8} y={mid - BOX_H/2} width={8}    height={BOX_H} rx={CORNER}/>
                                        {m.players.some(p => p.winner) && (
                                            <rect className="win" x={x0+BOX_W} y={mid - BOX_H/2} width={8} height={BOX_H} rx={CORNER}/>
                                        )}
                                        <line className="mid" x1={x0} x2={x0+BOX_W} y1={mid} y2={mid}/>

                                        {/* İsimler */}
                                        {m.players.map((p, idx) => (
                                            <text key={idx} className="txt" x={x0+18} y={mid + (idx ? 22 : -22)}>
                                                {p.name}
                                            </text>
                                        ))}

                                        {/* TÜM SET SKORLARI – ayara bağlı */}
                                        {settings.showScores && allSets?.length ? (
                                            m.players.map((_, idx) => (
                                                <text
                                                    key={`s-all-${idx}`}
                                                    className="txt"
                                                    fontSize={13}
                                                    fill="#fff"
                                                    x={x0 + BOX_W - 10}
                                                    y={mid + (idx ? 22 : -22)}
                                                    textAnchor="end"
                                                >
                                                    {scoreTextFor(idx as 0 | 1)}
                                                </text>
                                            ))
                                        ) : null}

                                        {/* Bağlantılar */}
                                        <line className="ln" x1={x0-8}  y1={y1} x2={x0-8} y2={y2}/>
                                        <line className="ln" x1={x0-8}  y1={mid} x2={x0}   y2={mid}/>
                                        {r < rounds.length - 1 && (
                                            <line className="ln" x1={x0+BOX_W+8} y1={mid} x2={x1-8} y2={mid}/>
                                        )}

                                        {/* Click alanı */}
                                        <rect
                                            className="hit"
                                            x={x0}
                                            y={mid - BOX_H/2}
                                            width={BOX_W}
                                            height={BOX_H}
                                            fill="transparent"
                                            onClick={() => setSelected({ r, m: i })}
                                        />
                                        <rect className="outline" x={x0-8} y={mid - BOX_H/2} width={BOX_W+16} height={BOX_H} rx={CORNER+2}/>
                                    </g>
                                )
                            })
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {/* Modal */}
            {selected && (
                <MatchModal
                    match={rounds[selected.r][selected.m]}
                    onSave={saveMeta}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    )
})
