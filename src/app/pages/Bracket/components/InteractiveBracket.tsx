import { useEffect, useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import { type Match, type Meta, useBracket } from '../../../hooks/useBracket.tsx';

/* --- Görsel sabitler --- */
const COL_W   = 110;   // her kolondaki blok genişliği
const GAP_W   = 40;    // kolonlar arası yatay boşluk
const PAD     = 8;     // tıklama alanı için tampon
const V       = 40;    // ilk yarı yüksekliği
const STROKE  = '#e5e7eb';
const GLOW    = '#38bdf8';

type LayoutCell = { mid: number; y1: number; y2: number };

export default function InteractiveBracket() {
    /* 1) API: tek turnuva matrisi */
    const { data: bracket, isLoading, isError, refetch } = useBracket();

    /* 2) Lokal kopya + seçim */
    const [rounds, setRounds] = useState<Match[][]>([]);
    const [selected, setSelected] = useState<{ r: number; m: number } | null>(null);

    /* 3) Veri eşitle */
    useEffect(() => {
        if (Array.isArray(bracket)) setRounds(bracket);
    }, [bracket]);

    /* 4) Yerleşim hesapla */
    const layout: LayoutCell[][] = useMemo(() => {
        if (!rounds.length) return [];
        return rounds.map((rd, r) => {
            const span = V * 2 ** r;                 // bu round’daki aralık
            return rd.map((_, m) => {
                const mid = V + span + m * span * 2;   // orta nokta
                return { mid, y1: mid - span / 2, y2: mid + span / 2 };
            });
        });
    }, [rounds]);

    /* 5) SVG boyutu */
    const svgHeight = layout.length ? layout[0][layout[0].length - 1].mid + V : 240;
    const svgWidth  = rounds.length ? 20 + rounds.length * (COL_W + GAP_W) : 720;

    /* 6) Modal kaydet → lokal state */
    const persist = (meta: Meta) => {
        if (!selected) return;
        setRounds(prev =>
            prev.map((rd, r) =>
                rd.map((mt, m) =>
                    r === selected.r && m === selected.m ? { ...mt, meta } : mt
                )
            )
        );
        setSelected(null);
    };

    /* 7) Durum ekranları */
    if (isLoading) {
        return (
            <div className="flex h-full min-h-[60vh] items-center justify-center text-gray-400">
                Yükleniyor…
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-full min-h-[60vh] items-center justify-center gap-4">
                <span className="text-red-400">Bracket verisi alınamadı.</span>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    if (!rounds.length) {
        return (
            <div className="flex h-full min-h-[60vh] items-center justify-center text-gray-400">
                Gösterilecek eşleşme bulunamadı.
            </div>
        );
    }

    /* 8) Çizim */
    return (
        <div className="w-full h-full">
            <style>{`
        .click-area{stroke:transparent;stroke-width:2;transition:stroke .12s,filter .12s;}
        .click-area:hover{stroke:${GLOW};filter:drop-shadow(0 0 6px ${GLOW});}
        text{ fill:#e5e7eb; font-size:13px; font-weight:600; }
      `}</style>

            <TransformWrapper
                wheel={{ step: 80 }}
                doubleClick={{ mode: 'zoomOut' }}
                minScale={0.4}
                maxScale={4}
                limitToBounds={false}
            >
                <TransformComponent>
                    <svg
                        width={svgWidth}
                        height={svgHeight}
                        role="img"
                        textRendering="optimizeLegibility"
                        style={{ imageRendering: 'crisp-edges' }}
                    >
                        {rounds.map((rd, r) => {
                            const x  = 20 + r * (COL_W + GAP_W);
                            const nx = x + COL_W + GAP_W;

                            return rd.map((mt, m) => {
                                const { mid, y1, y2 } = layout[r][m];

                                return (
                                    <g key={`${r}-${m}`} stroke={STROKE} strokeWidth={2} fill="none">
                                        {/* Tıklanabilir alan */}
                                        <rect
                                            className="click-area"
                                            x={x - PAD / 2}
                                            y={y1 - PAD / 2}
                                            width={COL_W + PAD}
                                            height={y2 - y1 + PAD}
                                            fill="transparent"
                                            cursor="pointer"
                                            onClick={() => setSelected({ r, m })}
                                        />

                                        {/* Maç dikdörtgeni */}
                                        <line x1={x} x2={x + COL_W} y1={y1} y2={y1} vectorEffect="non-scaling-stroke" />
                                        <line x1={x} x2={x + COL_W} y1={y2} y2={y2} vectorEffect="non-scaling-stroke" />
                                        <line x1={x + COL_W} x2={x + COL_W} y1={y1} y2={y2} vectorEffect="non-scaling-stroke" />

                                        {/* Sonraki round hattı */}
                                        {r < rounds.length - 1 && (
                                            <line x1={x + COL_W} x2={nx} y1={mid} y2={mid} vectorEffect="non-scaling-stroke" />
                                        )}

                                        {/* Oyuncular */}
                                        {mt.players.map((p, i) => (
                                            <text
                                                key={i}
                                                x={x + 6}
                                                y={(i === 0 ? y1 : y2) - 6}
                                                pointerEvents="none"
                                            >
                                                {p.seed} {p.name}{p.winner ? ' ✅' : ''}
                                            </text>
                                        ))}

                                        {/* Meta (skor/tarih/saat) */}
                                        {!!mt.meta?.score && (
                                            <text
                                                x={x + 6}
                                                y={mid}
                                                style={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 500 }}
                                                pointerEvents="none"
                                            >
                                                {mt.meta.score}
                                            </text>
                                        )}
                                        {!!mt.meta?.date && (
                                            <text
                                                x={x + 6}
                                                y={mid + 14}
                                                style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                                                pointerEvents="none"
                                            >
                                                {mt.meta.date}{mt.meta.time ? ` • ${mt.meta.time}` : ''}
                                            </text>
                                        )}
                                    </g>
                                );
                            });
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {/* Modal */}
            {selected && (
                <MatchModal
                    match={rounds[selected.r][selected.m]}
                    onSave={persist}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}