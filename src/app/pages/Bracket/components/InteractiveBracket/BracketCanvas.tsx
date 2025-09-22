// src/app/pages/Bracket/components/InteractiveBracket/BracketCanvas.tsx
import { memo, useMemo } from 'react';
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

const fixTurkishIDot = (s: string) =>
    (s || '').normalize('NFKC').replace(/\u0049\u0307/g, 'İ').replace(/\u0069\u0307/g, 'i');

const abbreviateGivenNames = (fullName?: string) => {
    const s = fixTurkishIDot((fullName || '').trim().replace(/\s+/g, ' '));
    if (!s) return s;
    const parts = s.split(' ');
    if (parts.length === 1) return s;
    const last = parts.at(-1)!;
    const given = parts.slice(0, -1).map(w => {
        const lw = w.toLocaleLowerCase('tr');
    });
    return [...given, last].join(' ');
};

const abbreviateClub = (club?: string) => {
    const c = fixTurkishIDot((club || '').trim());
    if (!c) return '';
    return c
        .replace(/\bSpor Kul(ü|u)b(ü|u)\b/gi, 'SK')
        .replace(/\bSpor\b/gi, 'S.')
        .replace(/\bKul(ü|u)b(ü|u)\b/gi, 'Klb.');
};

const formatLabel = (name?: string, club?: string) => {
    const n = abbreviateGivenNames(name);
    const k = abbreviateClub(club);
    return k ? `${n} (${k})` : (n || '—');
};

const cutFit = (s: string, pxWidth: number, fontPx: number) => {
    const approxCharW = fontPx * 0.58;
    const maxChars = Math.max(4, Math.floor(pxWidth / approxCharW));
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
};

function luminance(c: string): number {
    const m = /^#([0-9a-f]{6})$/i.exec((c || '').trim());
    if (!m) return 0;
    const v = parseInt(m[1], 16);
    const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

function badgeDims(matchNo: number, fontPx: number) {
    const digits = String(matchNo ?? '').length || 1;
    const padX = Math.round(fontPx * 0.90);
    const textW = Math.round(digits * fontPx * 0.70);
    const w = Math.max(36, textW + padX * 2);
    const h = Math.max(24, Math.round(fontPx * 1.8));
    const rx = Math.max(7, Math.round(h * 0.35));
    return { w, h, rx };
}

export default memo(function BracketCanvas({
                                               rounds, palette, showMatchNo, highlight, mode, onSelect, sizes, svgDims,
                                           }: Props) {
    const { BOX_W, BOX_H, GAP, BASE, CORNER } = sizes;

    const textFill = useMemo(() => {
        const L = luminance((palette as any)?.bg as string);
        return L > 160 ? '#0b1220' : '#f1f5f9';
    }, [palette]);

    const MAIN_FONT = useMemo(() => Math.max(14, Math.min(20, Math.round(BOX_H * 0.30))), [BOX_H]);
    const MNO_FONT  = useMemo(() => Math.max(13, Math.min(22, Math.round(BOX_H * 0.36))), [BOX_H]);

    // yeni etiket ölçüleri (kutu yüksekliğine göre ölçek)
    const TAG_W         = Math.max(10, Math.round(BOX_H * 0.12));   // ince kapsül
    const TAG_H         = Math.max(16, Math.round(BOX_H * 0.40));
    const TAG_RX        = Math.round(TAG_W / 2);
    const TEXT_PAD_LEFT = 18 + TAG_W + 12; // soldan metin başlangıcı

    return (
        <svg width={svgDims.width} height={svgDims.height}
             style={{ position: 'absolute', left: svgDims.left, top: svgDims.top }}>
            <defs>
                <style>{`
          .rect{fill:${(palette as any).bg}}
          .bar {fill:${(palette as any).bar}}
          .mid {stroke:${(palette as any).bar};stroke-width:1.4;vector-effect:non-scaling-stroke}
          .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
          .txt {
            font-weight: 700;
            font-size: ${MAIN_FONT}px;
            line-height: 1.15;
            font-family: "Inter var", Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
            fill: ${textFill};
            dominant-baseline: middle;
            paint-order: stroke fill;
            stroke: rgba(0,0,0,.55);
            stroke-width: .9;
            letter-spacing: .2px;
            text-rendering: geometricPrecision;
          }
          .win {fill:${(palette as any).win}}
          .outline{stroke:url(#g);fill:none;stroke-width:0}
          .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${(palette as any).glow2})}
          .done {opacity:.92}
          .tick {fill:#22c55e}
          .hl { fill:#fff; stroke:#22d3ee; stroke-width:1.2; paint-order:stroke fill }

          .mno-bg {
            fill: rgba(34,197,94,.14);
            stroke: ${(palette as any).win};
            stroke-width: 1.8;
            vector-effect: non-scaling-stroke;
          }
          .mno-txt{
            font-weight: 800;
            font-size: ${MNO_FONT}px;
            letter-spacing:.35px;
            dominant-baseline:middle;
            paint-order: stroke fill;
            stroke: rgba(0,0,0,.45);
            stroke-width:.7;
            text-rendering: geometricPrecision;
            fill:#eafff3;
          }

          /* ==== Oyuncu renk kapsülleri ==== */
          .ptag-shadow { filter:url(#tagShadow); }
          .ptag-ring   { fill:none; stroke:rgba(255,255,255,.75); stroke-width:.9; }
          .ptag-win    { stroke:#22c55e; stroke-width:1.5; }
          .ptag-gloss  { fill:rgba(255,255,255,.18); } /* üst parlama */

          .ptag-blue { fill:url(#grad-blue); }
          .ptag-red  { fill:url(#grad-red);  }
        `}</style>

                <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor={(palette as any).glow1} />
                    <stop offset="100%" stopColor={(palette as any).glow2} />
                </linearGradient>

                {/* yumuşak gölge */}
                <filter id="tagShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="rgba(0,0,0,.45)" />
                </filter>

                {/* hafif dikey degrade – daha “buton” görünümü */}
                <linearGradient id="grad-blue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0"   stopColor="#60a5fa"/>
                    <stop offset="1.0" stopColor="#2563eb"/>
                </linearGradient>
                <linearGradient id="grad-red" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0"   stopColor="#f87171"/>
                    <stop offset="1.0" stopColor="#dc2626"/>
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
                    const finished = m.players.some(p => p.winner != null);
                    const x0 = x0base;

                    const mnoVal = (m as any)?.meta?.matchNo as number | undefined;
                    const dims   = (typeof mnoVal === 'number') ? badgeDims(mnoVal, MNO_FONT) : null;

                    return (
                        <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                            {showMatchNo && typeof mnoVal === 'number' && dims && (
                                <g transform={`translate(${x0 - 34}, ${mid}) rotate(-90)`}>
                                    <rect className="mno-bg" x={-dims.w/2} y={-dims.h/2} width={dims.w} height={dims.h} rx={dims.rx}/>
                                    <text className="mno-txt" x={0} y={0} textAnchor="middle">{mnoVal}</text>
                                    <title>{`Maç ${mnoVal}`}</title>
                                </g>
                            )}

                            <rect className="rect" x={x0} y={mid - BOX_H/2} width={BOX_W} height={BOX_H} rx={CORNER}/>
                            <rect className="bar"  x={x0 - 8} y={mid - BOX_H/2} width={8} height={BOX_H} rx={CORNER}/>
                            {m.players.some(p => p.winner) && (
                                <rect className="win" x={x0 + BOX_W} y={mid - BOX_H/2} width={8} height={BOX_H} rx={CORNER}/>
                            )}
                            <line className="mid" x1={x0} x2={x0 + BOX_W} y1={mid} y2={mid}/>

                            {m.players.map((p, idx) => {
                                const y = mid + (idx ? 22 : -22);
                                const clubRaw = (p?.club || '').trim();

                                const labelRaw = formatLabel(p?.name, clubRaw);
                                const avail    = BOX_W - (TEXT_PAD_LEFT + 10);
                                const label    = cutFit(labelRaw, avail, MAIN_FONT);
                                const muted    = (labelRaw === '—');

                                const q = (highlight || '').toLocaleLowerCase('tr');
                                const isHL =
                                    !!q &&
                                    ((p?.name || '').toLocaleLowerCase('tr').includes(q) ||
                                        clubRaw.toLocaleLowerCase('tr').includes(q) ||
                                        label.toLocaleLowerCase('tr').includes(q));

                                const tagX = x0 + 18;
                                const tagY = y;

                                return (
                                    <g key={idx}>
                                        {/* renk kapsülü + parlama + (kazanan ise) halka */}
                                        <g className="ptag-shadow">
                                            <rect
                                                x={tagX} y={tagY - TAG_H/2}
                                                width={TAG_W} height={TAG_H} rx={TAG_RX}
                                                className={idx === 0 ? 'ptag-blue' : 'ptag-red'}
                                                opacity={muted ? 0.45 : 1}
                                            />
                                            {/* üst parlama */}
                                            <rect
                                                x={tagX + 1} y={tagY - TAG_H/2 + 1}
                                                width={TAG_W - 2} height={Math.max(6, TAG_H * 0.46)}
                                                rx={TAG_RX - 1} className="ptag-gloss"
                                                opacity={muted ? 0.28 : 0.38}
                                            />
                                            {/* kazanan halkası */}
                                            {p.winner ? (
                                                <rect
                                                    x={tagX - 2} y={tagY - TAG_H/2 - 2}
                                                    width={TAG_W + 4} height={TAG_H + 4}
                                                    rx={TAG_RX + 2}
                                                    className={`ptag-ring ptag-win`}
                                                />
                                            ) : (
                                                <rect
                                                    x={tagX - 1} y={tagY - TAG_H/2 - 1}
                                                    width={TAG_W + 2} height={TAG_H + 2}
                                                    rx={TAG_RX + 1}
                                                    className="ptag-ring"
                                                    opacity={muted ? .25 : .45}
                                                />
                                            )}
                                        </g>

                                        {/* isim */}
                                        <text className={`txt ${isHL ? 'hl' : ''}`} x={x0 + TEXT_PAD_LEFT} y={y} opacity={muted ? .7 : 1}>
                                            <tspan>{label}</tspan>
                                            {p.winner && <tspan className="tick" dx="8">✓</tspan>}
                                        </text>
                                    </g>
                                );
                            })}

                            <line className="ln" x1={x0 - 8} y1={y1} x2={x0 - 8} y2={y2} />
                            <line className="ln" x1={x0 - 8} y1={mid} x2={x0} y2={mid} />
                            {r < rounds.length - 1 && (
                                <line className="ln" x1={x0 + BOX_W + 8} y1={mid} x2={x1 - 8} y2={mid}/>
                            )}

                            {mode === 'edit' && (
                                <rect className="hit" x={x0} y={mid - BOX_H/2} width={BOX_W} height={BOX_H}
                                      fill="transparent" onClick={() => onSelect(r, i)} />
                            )}
                            <rect className="outline" x={x0 - 8} y={mid - BOX_H/2} width={BOX_W + 16} height={BOX_H} rx={CORNER + 2}/>
                        </g>
                    );
                });
            })}
        </svg>
    );
});
