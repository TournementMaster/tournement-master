// src/app/pages/Bracket/components/InteractiveBracket/BracketCanvas.tsx
import { memo } from 'react';
import type { Matrix } from "./bracketData.ts";
import type { Palette } from '../../../../context/themePalettes';

type Sizes = { BOX_W: number; BOX_H: number; GAP: number; BASE: number; CORNER: number };
type Dims = { width: number; height: number; left: number; top: number };

type Props = {
    rounds: Matrix;
    palette: Palette;
    showMatchNo: boolean;
    highlight: string;
    mode: 'view' | 'edit';
    onSelect: (r: number, m: number) => void;
    sizes: Sizes;
    svgDims: Dims;
};

const cut = (s = '', n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default memo(function BracketCanvas({
                                               rounds,
                                               palette,
                                               showMatchNo,
                                               highlight,
                                               mode,
                                               onSelect,
                                               sizes,
                                               svgDims,
                                           }: Props) {
    const { BOX_W, BOX_H, GAP, BASE, CORNER } = sizes;

    return (
        <svg
            width={svgDims.width}
            height={svgDims.height}
            style={{ position: 'absolute', left: svgDims.left, top: svgDims.top }}
        >
            <defs>
                <style>{`
          .rect{fill:${palette.bg}}
          .bar {fill:${palette.bar}}
          .mid {stroke:${palette.bar};stroke-width:1.4}
          .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
          .txt {
            font: 700 17px/1 Inter, ui-sans-serif;
            fill: #f1f5f9;                           /* daha güçlü kontrast */
            dominant-baseline: middle;
            paint-order: stroke fill;
            stroke: rgba(0,0,0,.55);                 /* outline */
            stroke-width: .8;
            letter-spacing: .15px;
          }
          .win {fill:${palette.win}}
          .outline{stroke:url(#g);fill:none;stroke-width:0}
          .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${palette.glow2})}
          .done {opacity:.88}                        /* eskiden .55 idi → daha görünür */
          .tick {fill:#22c55e}
          .hl { fill:#fff; stroke:#22d3ee; stroke-width:1.2; paint-order:stroke fill }
          .mno-bg { fill: rgba(34,197,94,.14); stroke: ${palette.win}; stroke-width:1.6; rx:7 }
          .mno-txt{ font: 800 12px/1 Inter,ui-sans-serif; fill:#eafff3; letter-spacing:.35px; dominant-baseline:middle;
                    paint-order: stroke fill; stroke: rgba(0,0,0,.45); stroke-width:.6; }
        `}</style>
                <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor={palette.glow1} />
                    <stop offset="100%" stopColor={palette.glow2} />
                </linearGradient>
            </defs>

            {rounds.map((round, r) => {
                const x0base = 64 + r * (BOX_W + GAP);
                const x1 = x0base + BOX_W + GAP;
                return round.map((m, i) => {
                    const span = BASE << r;
                    const mid = BASE + span + i * span * 2;
                    const y1 = mid - span / 2;
                    const y2 = mid + span / 2;
                    const finished = m.players.some((p) => p.winner != null);
                    const x0 = x0base;

                    return (
                        <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                            {showMatchNo && typeof m.meta?.matchNo === 'number' && (
                                <g transform={`translate(${x0 - 24}, ${mid}) rotate(-90)`}>
                                    <rect className="mno-bg" x={-18} y={-12} width={36} height={24} rx={7} />
                                    <text className="mno-txt" x={0} y={0} textAnchor="middle">
                                        {m.meta!.matchNo}
                                    </text>
                                    <title>{`Maç ${m.meta!.matchNo}`}</title>
                                </g>
                            )}

                            <rect className="rect" x={x0} y={mid - BOX_H / 2} width={BOX_W} height={BOX_H} rx={CORNER} />
                            <rect className="bar" x={x0 - 8} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER} />
                            {m.players.some((p) => p.winner) && (
                                <rect className="win" x={x0 + BOX_W} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER} />
                            )}
                            <line className="mid" x1={x0} x2={x0 + BOX_W} y1={mid} y2={mid} />

                            {m.players.map((p, idx) => {
                                const y = mid + (idx ? 22 : -22);
                                const club = (p?.club || '').trim();
                                const clubShort = club ? ` (${cut(club, 18)})` : '';
                                const label = (p?.name || '—') + clubShort;
                                const isHL =
                                    highlight &&
                                    (p?.name?.toLowerCase()?.includes(highlight) ||
                                        club?.toLowerCase()?.includes(highlight));
                                return (
                                    <g key={idx}>
                                        <text className={`txt ${isHL ? 'hl' : ''}`} x={x0 + 18} y={y}>
                                            <tspan>{label}</tspan>
                                            {p.winner && <tspan className="tick" dx="8">✓</tspan>}
                                        </text>
                                    </g>
                                );
                            })}

                            <line className="ln" x1={x0 - 8} y1={y1} x2={x0 - 8} y2={y2} />
                            <line className="ln" x1={x0 - 8} y1={mid} x2={x0} y2={mid} />
                            {r < rounds.length - 1 && (
                                <line className="ln" x1={x0 + BOX_W + 8} y1={mid} x2={x1 - 8} y2={mid} />
                            )}

                            {/* Tıklanınca büyük ✓ modalı */}
                            {mode === 'edit' && (
                                <rect
                                    className="hit"
                                    x={x0}
                                    y={mid - BOX_H / 2}
                                    width={BOX_W}
                                    height={BOX_H}
                                    fill="transparent"
                                    onClick={() => onSelect(r, i)}
                                />
                            )}
                            <rect
                                className="outline"
                                x={x0 - 8}
                                y={mid - BOX_H / 2}
                                width={BOX_W + 16}
                                height={BOX_H}
                                rx={CORNER + 2}
                            />
                        </g>
                    );
                });
            })}
        </svg>
    );
});
