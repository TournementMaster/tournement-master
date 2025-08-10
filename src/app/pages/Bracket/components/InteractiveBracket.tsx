import { memo, useEffect, useMemo, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import MatchModal from './MatchModal'
import { useBracketTheme, type BracketThemeKey } from '../../../context/BracketThemeContext'
import { PALETTES, type ThemeKey, type Palette } from '../../../context/themePalettes'
import { usePlayers, type Participant } from '../../../hooks/usePlayers'
import { useSettings } from '../../../context/BracketSettingsCtx'

export interface Player { seed: number; name: string; club?: string; winner?: boolean }
export interface Meta   { scores?: [number, number][]; manual?: 0 | 1; time?: string; court?: string; }
export interface Match  { players: Player[]; meta?: Meta }
type Matrix = Match[][]

const BOX_W=340, BOX_H=78, GAP=120, BASE=BOX_H, CORNER=10
type Pos = { mid:number; y1:number; y2:number }

function blank(): Match { return { players:[{seed:0,name:'—'},{seed:0,name:'—'}] } }
function ellipsize(s: string, max = 16) { return s && s.length>max ? s.slice(0, max-1)+'…' : s }

/** Dinamik standart seeding sırası (2→4→8→… genişler) */
function seedOrder(size:number): number[] {
    if (size < 2) return [1]
    let prev = [1,2]
    while (prev.length < size) {
        const n = prev.length * 2
        const comp = prev.map(x => n + 1 - x)
        const next:number[] = []
        for (let i=0;i<prev.length;i+=2){
            const a = prev[i],   b = prev[i+1]
            const A = comp[i],   B = comp[i+1]
            next.push(a, A, B, b)
        }
        prev = next
    }
    return prev
}
function nextPowerOfTwo(n: number) { let s=1; while(s<n) s<<=1; return Math.max(4,s) }

/** Seed → slotSeed eşlemeyi dikkate alarak ilk tur çizgilerini kurar */
function buildMatrix(participants: Participant[], placementMap: Record<number,number>|null): Matrix {
    const n = participants.length
    const size = nextPowerOfTwo(n)
    const order = seedOrder(size)

    // slotSeed → player (oyuncunun seed'i değişmeden görünür)
    const slotToPlayer = new Map<number, Player>()
    for (const p of participants) {
        const slotSeed = placementMap?.[p.seed] ?? p.seed
        slotToPlayer.set(slotSeed, { seed: p.seed, name: p.name, club: p.club })
    }

    // İlk raund
    const r0: Match[] = []
    for (let i=0; i<order.length; i+=2){
        const a = slotToPlayer.get(order[i])   ?? { seed:0, name:'—' }
        const b = slotToPlayer.get(order[i+1]) ?? { seed:0, name:'—' }
        r0.push({ players: [a, b] })
    }

    // Sonraki raundlar
    const rounds: Matrix = [r0]
    let games = size/4
    while (games >= 1) { rounds.push(Array(games).fill(0).map(blank)); games /= 2 }
    return rounds
}

function propagate(matrix: Matrix): Matrix {
    const mat: Matrix = matrix.map(r => r.map(m => ({
        players: m.players.map(p => ({ ...p })),
        meta: m.meta ? { ...m.meta, scores: m.meta.scores ? [...m.meta.scores] as [number,number][] : undefined } : undefined,
    })))

    for (let r = 0; r < mat.length - 1; r++) {
        mat[r].forEach((m, idx) => {
            const [p1, p2] = m.players
            let winner: 0 | 1 | undefined

            // Bye/boş kontrolü SADECE ilk turda
            if (r === 0) {
                const aBye = p1.seed === 0 || p1.name === '—'
                const bBye = p2.seed === 0 || p2.name === '—'
                if (aBye && !bBye) winner = 1
                else if (bBye && !aBye) winner = 0
            }

            // Skor veya manuel kazanan
            if (winner == null && m.meta?.scores?.length) {
                const [a, b] = m.meta.scores[0]
                if (a !== b) winner = a > b ? 0 : 1
                else if (m.meta.manual != null) winner = m.meta.manual
            }

            if (winner != null) {
                // bu maç bitti → tik/soluklaştırma
                m.players[winner]   = { ...m.players[winner], winner: true }
                m.players[1-winner] = { ...m.players[1-winner], winner: false }

                // SONRAKİ TUR: oyuncuyu taşı ama winner bayrağını SIFIRLA (bir sonraki maç otomatik tik almasın)
                const next = mat[r+1][Math.floor(idx/2)]
                const moved = { ...m.players[winner] }
                delete moved.winner
                next.players[idx%2] = moved
            }
        })
    }
    return mat
}

function resolveThemeKey(k: BracketThemeKey): ThemeKey {
    switch (k) {
        case 'classic-dark':
        case 'classic-light': return 'classic'
        case 'modern-dark':
        case 'modern-light':  return 'purple'
        case 'purple-orange': return 'orange'
        case 'black-white':   return 'invert'
        case 'ocean': return 'ocean'
        case 'forest':return 'forest'
        case 'rose':  return 'rose'
        case 'gold':  return 'gold'
        case 'crimson':return 'crimson'
        case 'teal':  return 'teal'
        case 'slate': return 'slate'
        default:      return 'classic'
    }
}

export default memo(function InteractiveBracket(){
    const { players }  = usePlayers()
    const { settings } = useSettings()
    const themeKey     = useBracketTheme()
    const palette:Palette = PALETTES[resolveThemeKey(themeKey)]

    const [rounds,setRounds]=useState<Matrix>(()=>propagate(buildMatrix(players, settings.placementMap)))
    const [selected,setSelected]=useState<{r:number;m:number}|null>(null)

    // oyuncular veya yerleşim haritası / versiyon değiştiğinde yeniden kur
    useEffect(()=>{
        setRounds(propagate(buildMatrix(players, settings.placementMap)))
    },[players, settings.placementMap, settings.version])

    const layout=useMemo<Pos[][]>(()=>rounds.map((round,r)=>{
        const span=BASE<<r
        return round.map((_,i)=>{
            const mid=BASE+span+i*span*2
            return {mid,y1:mid-span/2,y2:mid+span/2}
        })
    }),[rounds])

    const svgHeight=(layout[0]?.at(-1)?.mid ?? 0)+BASE
    const svgWidth=56+rounds.length*(BOX_W+GAP)+200

    const saveMeta=(meta:Meta)=>{
        if(!selected) return
        setRounds(prev=>{
            const copy:Matrix=prev.map(rnd=>rnd.map(m=>({
                players:m.players.map(p=>({...p})),
                meta:m.meta?{...m.meta}:undefined
            })))
            copy[selected.r][selected.m].meta=meta
            return propagate(copy)
        })
        setSelected(null)
    }

    return (
        <div className="relative">
            <TransformWrapper
                minScale={0.4} maxScale={3.5}
                limitToBounds={false}
                centerOnInit={false}
                doubleClick={{ disabled: true }}
                panning={{ velocityDisabled: true }}
                wheel={{ step: 120 }}
                pinch={{ step: 10 }}
            >
                <TransformComponent wrapperClass="min-w-fit">
                    <svg width={svgWidth} height={svgHeight}>
                        <defs>
                            <style>{`
                .rect{fill:${palette.bg}}
                .bar {fill:${palette.bar}}
                .mid {stroke:${palette.bar};stroke-width:1.4}
                .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
                .txt {font:600 17px/1 Inter,sans-serif;fill:${palette.txt};dominant-baseline:middle}
                .sub {font:600 12px/1 Inter,sans-serif;fill:#9aa4b2;dominant-baseline:middle}
                .win {fill:${palette.win}}
                .outline{stroke:url(#g);fill:none;stroke-width:0}
                .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${palette.glow2})}
                .done {opacity:.55}
                .tick {fill:#22c55e}
                .seed {font:600 12px/1 Inter,sans-serif;fill:#fff;opacity:.9}
              `}</style>
                            <linearGradient id="g" x1="0" x2="1">
                                <stop offset="0%" stopColor={palette.glow1}/>
                                <stop offset="100%" stopColor={palette.glow2}/>
                            </linearGradient>
                        </defs>

                        {rounds.map((round,r)=>{
                            const x0base=64+r*(BOX_W+GAP)
                            const x1=x0base+BOX_W+GAP
                            return round.map((m,i)=>{
                                const {mid,y1,y2}=layout[r][i]
                                const sets=m.meta?.scores
                                const scoreText=(idx:0|1)=>(sets??[]).map(s=>String(s[idx]??0)).join('·')
                                const bothHaveNames = m.players.every(p => p.name && p.name !== '—')
                                const finished = m.players.some(p => p.winner != null)
                                const x0 = x0base

                                return (
                                    <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                                        {/* seed numaraları – KUTU DIŞINDA (sol) */}
                                        {settings.showSeeds && m.players.map((p,idx)=>(
                                            p.seed>0 && p.name!=='—' ? (
                                                <text key={`seed-${idx}`} className="seed" x={x0-14} y={(mid+(idx?22:-22))} textAnchor="end">
                                                    {p.seed}
                                                </text>
                                            ) : null
                                        ))}

                                        <rect className="rect" x={x0} y={mid-BOX_H/2} width={BOX_W} height={BOX_H} rx={CORNER}/>
                                        <rect className="bar"  x={x0-8} y={mid-BOX_H/2} width={8} height={BOX_H} rx={CORNER}/>
                                        {m.players.some(p=>p.winner)&&(
                                            <rect className="win" x={x0+BOX_W} y={mid-BOX_H/2} width={8} height={BOX_H} rx={CORNER}/>
                                        )}
                                        <line className="mid" x1={x0} x2={x0+BOX_W} y1={mid} y2={mid}/>

                                        {m.players.map((p,idx)=>{
                                            // ... m.players.map((p,idx)=> {  (render kısmında)
                                            const y = mid+(idx?22:-22)
                                            return (
                                                <g key={idx}>
                                                    {/* İsim + tik (tspan ile ismin hemen sağına) */}
                                                    <text className="txt" x={x0+18} y={y}>
                                                        <tspan>{p.name}</tspan>
                                                        {p.winner && <tspan className="tick" dx="8">✓</tspan>}
                                                    </text>

                                                    {/* Kulüp (alt satır) */}
                                                    {!!p.club && (
                                                        <text className="sub" x={x0+18} y={y+16}>
                                                            {ellipsize(p.club, 16)}
                                                        </text>
                                                    )}
                                                </g>
                                            )

                                        })}

                                        {/* Skorlar SADECE showScores=true iken */}
                                        {settings.showScores && sets?.length && (
                                            m.players.map((_,idx)=>(
                                                <text key={`s-${idx}`} className="txt" fontSize={13} fill="#fff"
                                                      x={x0+BOX_W-10} y={mid+(idx?22:-22)} textAnchor="end">
                                                    {scoreText(idx as 0|1)}
                                                </text>
                                            ))
                                        )}

                                        {/* Time/Court yalnızca: skor kapalı && ilgili global anahtar açık */}
                                        {!settings.showScores && (m.meta?.time && settings.showTime) && (
                                            <text className="sub" x={x0+BOX_W-10} y={mid-BOX_H/2+14} textAnchor="end">
                                                {m.meta.time}
                                            </text>
                                        )}
                                        {!settings.showScores && (m.meta?.court && settings.showCourt) && (
                                            <text className="sub" x={x0+BOX_W-10} y={mid+BOX_H/2-12} textAnchor="end">
                                                Court {m.meta.court}
                                            </text>
                                        )}

                                        <line className="ln" x1={x0-8} y1={y1} x2={x0-8} y2={y2}/>
                                        <line className="ln" x1={x0-8} y1={mid} x2={x0} y2={mid}/>
                                        {r<rounds.length-1 && <line className="ln" x1={x0+BOX_W+8} y1={mid} x2={x1-8} y2={mid}/>}

                                        <rect className="hit" x={x0} y={mid-BOX_H/2} width={BOX_W} height={BOX_H}
                                              fill="transparent"
                                              onClick={()=> bothHaveNames && setSelected({r,m:i})}/>
                                        <rect className="outline" x={x0-8} y={mid-BOX_H/2} width={BOX_W+16} height={BOX_H} rx={CORNER+2}/>
                                    </g>
                                )
                            })
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {selected && (
                <MatchModal
                    match={rounds[selected.r][selected.m]}
                    onSave={saveMeta}
                    onClose={()=>setSelected(null)}
                />
            )}
        </div>
    )
})
