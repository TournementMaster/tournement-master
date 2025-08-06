/* =========================================================================
   FILE: src/app/pages/Bracket/components/InteractiveBracket.tsx
   Tema destekli, kupasız & başlıksız tek-eleme bracket — TÜM DOSYA
   ========================================================================= */
import { memo, useEffect, useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import { useBracket, type Match, type Meta } from '../../../hooks/useBracket';
import { useBracketTheme } from '../../../context/BracketThemeContext';

/* Sabitler --------------------------------------------------------------- */
const W = 330;           // kutu genişliği
const GAP = 124;         // round sütun aralığı
const H = 64;            // kutu yüksekliği
const BASE = H;          // round katsayısı (2ⁿ × BASE)
const SCORE = 20;        // skor kutucuğu eni

type Pos = { mid: number; y1: number; y2: number };

function InteractiveBracket({ id }: { id?: number }) {
    /* --- Tema paleti --- */
    const palette = useBracketTheme();   // { bg, bar, win, txt, glow1, glow2 }

    /* --- Veri & state --- */
    const { data, isLoading, isError, refetch } = useBracket(id);
    const [rounds, setRounds] = useState<Match[][]>([]);
    const [sel, setSel]       = useState<{ r: number; m: number } | null>(null);
    useEffect(() => { if (Array.isArray(data)) setRounds(data); }, [data]);

    /* --- Yerleşim matrisi --- */
    const layout: Pos[][] = useMemo(() => rounds.map((rd, r) => {
        const span = BASE << r;
        return rd.map((_, m) => {
            const mid = BASE + span + m * span * 2;
            return { mid, y1: mid - span / 2, y2: mid + span / 2 };
        });
    }), [rounds]);

    const svgH =
        layout.length ? layout[0][layout[0].length - 1].mid + BASE : 600;
    const svgW = 20 + rounds.length * (W + GAP) + 400;   // kupa kaldırıldı

    /* --- Modal kaydet --- */
    const saveMeta = (meta: Meta) => {
        if (!sel) return;
        setRounds(prev =>
            prev.map((rd, i) =>
                rd.map((m, j) => (i === sel.r && j === sel.m ? { ...m, meta } : m))
            )
        );
        setSel(null);
    };

    /* --- Durum ekranları --- */
    if (isLoading) return <Status text="Yükleniyor…" />;
    if (isError)   return <Status text="Veri alınamadı." retry={refetch} />;
    if (!rounds.length) return <Status text="Gösterilecek eşleşme yok." />;

    /* ------------------------- SVG ------------------------- */
    return (
        <div className="relative">
            <div style={{ pointerEvents: 'auto' }}>
                <TransformWrapper wheel={{ step: 120 }} minScale={0.4} maxScale={3.5}>
                    <TransformComponent wrapperClass="min-w-fit">
                        <svg width={svgW} height={svgH}>
                            {/* ---- Dinamik CSS ---- */}
                            <defs>
                                <style>{`
                  .rect{fill:#f2f2f2;pointer-events:none}
                  .bar {pointer-events:none;fill:#111}
                  .txt {font:600 22px/1 Inter,sans-serif;fill:${palette.txt};
                        dominant-baseline:middle;pointer-events:none}
                  .ln  {stroke:#111;stroke-width:4;
                         vector-effect:non-scaling-stroke;pointer-events:none}
                  .win {fill:${palette.win};pointer-events:none}
                  .hit {fill:transparent;cursor:pointer;pointer-events:all}
                  .hit:hover~.outline{
                    stroke-width:4;stroke:url(#glow);
                    filter:drop-shadow(0 0 6px ${palette.glow2})
                  }
                `}</style>

                                <linearGradient id="glow" x1="0" x2="1">
                                    <stop offset="0%"   stopColor={palette.glow1}/>
                                    <stop offset="100%" stopColor={palette.glow2}/>
                                </linearGradient>
                            </defs>

                            {rounds.map((rd, r) => {
                                const x  = 20 + r * (W + GAP);
                                const nx = x + W + GAP;

                                return rd.map((mt, m) => {
                                    const { mid, y1, y2 } = layout[r][m];
                                    const win = mt.players.find(p => p.winner);
                                    const scores: number[] = mt.meta?.scores ?? [];
                                    const scoreWidth = scores.length * SCORE;

                                    return (
                                        <g key={`${r}-${m}`}>
                                            {/* Tıklanabilir alan */}
                                            <rect className="hit"
                                                  x={x} y={mid - H / 2} width={W} height={H}
                                                  onClick={() => setSel({ r, m })} />

                                            {/* Ana kutu & barlar */}
                                            <rect className="rect"
                                                  x={x} y={mid - H / 2} width={W} height={H} rx={4}/>
                                            <rect className="bar"
                                                  x={x - 8} y={mid - H / 2} width={8} height={H}/>
                                            {win && (
                                                <rect className="win"
                                                      x={x + W} y={mid - H / 2} width={8} height={H}/>
                                            )}

                                            {/* Skor kutucukları */}
                                            {scores.map((sc, i) => (
                                                <g key={i} pointerEvents="none">
                                                    <rect x={x + W - scoreWidth + i * SCORE}
                                                          y={mid - H / 2}
                                                          width={SCORE - 2} height={H}
                                                          fill="#2a2a2a" rx={2}/>
                                                    <text className="txt"
                                                          x={x + W - scoreWidth + i * SCORE + SCORE/2}
                                                          y={mid + 2} fontSize={16}
                                                          textAnchor="middle" fill="#fff">
                                                        {sc}
                                                    </text>
                                                </g>
                                            ))}

                                            {/* Hover outline */}
                                            <rect className="outline"
                                                  x={x - 8} y={mid - H / 2}
                                                  width={W + 16} height={H} rx={6}
                                                  stroke="transparent" fill="none" />

                                            {/* Oyuncu adları */}
                                            {mt.players.map((p, i) => (
                                                <text key={i} className="txt"
                                                      x={x + 22} y={mid + (i ? 18 : -18)}>
                                                    {p.name}
                                                </text>
                                            ))}

                                            {/* Bağlantı çizgileri */}
                                            <line className="ln" x1={x - 8} y1={y1} x2={x - 8} y2={y2}/>
                                            <line className="ln" x1={x - 8} y1={mid} x2={x}   y2={mid}/>
                                            {r < rounds.length - 1 && (
                                                <line className="ln"
                                                      x1={x + W + 8} y1={mid}
                                                      x2={nx - 8}  y2={mid}/>
                                            )}
                                        </g>
                                    );
                                });
                            })}
                        </svg>
                    </TransformComponent>
                </TransformWrapper>
            </div>

            {/* Modal */}
            {sel && (
                <MatchModal
                    match={rounds[sel.r][sel.m]}
                    onSave={saveMeta}
                    onClose={() => setSel(null)}
                />
            )}
        </div>
    );
}

/* -------------------- Durum bileşeni -------------------- */
const Status = ({ text, retry }: { text: string; retry?: () => void }) => (
    <div className="flex h-[60vh] items-center justify-center gap-6">
        <span className="text-gray-400 text-2xl">{text}</span>
        {retry && (
            <button onClick={retry}
                    className="px-6 py-2 bg-blue-600 text-xl rounded">
                ↻
            </button>
        )}
    </div>
);

export default memo(InteractiveBracket);
