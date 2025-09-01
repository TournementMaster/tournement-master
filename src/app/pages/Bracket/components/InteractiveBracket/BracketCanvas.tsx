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

const cut = (s = '', n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// TR i-dot normalize ("i̇" → "i", "İ" → "İ")
const fixTurkishIDot = (s: string) =>
    (s || '').normalize('NFKC')
        .replace(/\u0049\u0307/g, 'İ') // "İ"
        .replace(/\u0069\u0307/g, 'i'); // "i̇"

// "Muhammed/Muhammet" → "M."
const abbreviateGivenNames = (fullName?: string) => {
    const s = fixTurkishIDot((fullName || '').trim().replace(/\s+/g, ' '));
    if (!s) return s;
    const parts = s.split(' ');
    if (parts.length === 1) return s;
    const last = parts[parts.length - 1];
    const given = parts.slice(0, -1).map(w => {
        const lw = w.toLocaleLowerCase('tr');
        if (lw === 'muhammed' || lw === 'muhammet') return 'M.';
        return w;
    });
    return [...given, last].join(' ');
};

// "Spor Kulübü" → "SK", "Spor" → "S.", "Kulübü/Kulubu" → "Klb."
const abbreviateClub = (club?: string) => {
    const c = fixTurkishIDot((club || '').trim());
    if (!c) return '';
    return c
        .replace(/\bSpor Kul(ü|u)b(ü|u)\b/gi, 'SK')
        .replace(/\bSpor\b/gi, 'S.')
        .replace(/\bKul(ü|u)b(ü|u)\b/gi, 'Klb.');
};

// Görünecek etiket
const formatLabel = (name?: string, club?: string) => {
    const n = abbreviateGivenNames(name);
    const k = abbreviateClub(club);
    return k ? `${n} (${k})` : n;
};

// SVG metnini kutuya sığdırmak için yaklaşık genişlik kesmesi
const cutFit = (s: string, pxWidth: number, fontPx: number) => {
    // Ortalama karakter genişliği ~ 0.58 * font
    const approxCharW = fontPx * 0.58;
    const maxChars = Math.max(4, Math.floor(pxWidth / approxCharW));
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
};

/** Hex rengin parlaklığını kaba hesapla (0..255). Hex değilse koyu varsay */
function luminance(c: string): number {
    const m = /^#([0-9a-f]{6})$/i.exec((c || '').trim());
    if (!m) return 0;
    const v = parseInt(m[1], 16);
    const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    // perceptual
    return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

/** Maç no rozeti için ölçüleri, yazı boyuna göre basitçe tahmin et */
function badgeDims(matchNo: number, fontPx: number) {
    const digits = String(matchNo ?? '').length || 1;
    const padX = Math.round(fontPx * 0.90);
    const padY = Math.round(fontPx * 0.55);
    const textW = Math.round(digits * fontPx * 0.70);
    const w = Math.max(36, textW + padX * 2);
    const h = Math.max(24, Math.round(fontPx * 1.8));
    const rx = Math.max(7, Math.round(h * 0.35));
    return { w, h, rx };
}

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

    // Arka plan parlaklığına göre yazı rengi seç
    const textFill = useMemo(() => {
        const L = luminance((palette as any)?.bg as string);
        // L>160 ise açık zemin → koyu yazı; aksi halde açık yazı
        return L > 160 ? '#0b1220' : '#f1f5f9';
    }, [palette]);

    // Dinamik fontlar (kutunun yüksekliğine göre akıllı ölçek)
    const MAIN_FONT = useMemo(
        () => Math.max(14, Math.min(20, Math.round(BOX_H * 0.30))),
        [BOX_H]
    );
    const MNO_FONT = useMemo(
        () => Math.max(13, Math.min(22, Math.round(BOX_H * 0.36))),
        [BOX_H]
    );

    return (
        <svg
            width={svgDims.width}
            height={svgDims.height}
            style={{ position: 'absolute', left: svgDims.left, top: svgDims.top }}
        >
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

          /* Maç no rozetleri: daha büyük, kontrastı yüksek */
          .mno-bg {
            fill: rgba(34,197,94,.14);
            stroke: ${(palette as any).win};
            stroke-width: 1.8;
            vector-effect: non-scaling-stroke;
          }
          .mno-txt{
            font-weight: 800;
            font-size: ${MNO_FONT}px;
            line-height: 1;
            font-family: "Inter var", Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
            fill:#eafff3;
            letter-spacing:.35px;
            dominant-baseline:middle;
            paint-order: stroke fill;
            stroke: rgba(0,0,0,.45);
            stroke-width:.7;
            text-rendering: geometricPrecision;
          }
        `}</style>
                <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor={(palette as any).glow1} />
                    <stop offset="100%" stopColor={(palette as any).glow2} />
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

                    // Maç no rozeti ölçüleri
                    const mnoVal = (m as any)?.meta?.matchNo as number | undefined;
                    const dims = (typeof mnoVal === 'number') ? badgeDims(mnoVal, MNO_FONT) : null;

                    return (
                        <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                            {showMatchNo && typeof mnoVal === 'number' && dims && (
                                <g transform={`translate(${x0 - 34}, ${mid}) rotate(-90)`}>
                                    <rect
                                        className="mno-bg"
                                        x={-dims.w / 2}
                                        y={-dims.h / 2}
                                        width={dims.w}
                                        height={dims.h}
                                        rx={dims.rx}
                                    />
                                    <text className="mno-txt" x={0} y={0} textAnchor="middle">
                                        {mnoVal}
                                    </text>
                                    <title>{`Maç ${mnoVal}`}</title>
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
                                const clubRaw = (p?.club || '').trim();

// Görsel etiket (i-dot fix + kısaltmalar)
                                const labelRaw = formatLabel(p?.name, clubRaw) || '—';

// SVG içinde taşmayı engelle (kutu içi kullanılabilir genişlik)
                                const avail = BOX_W - 28; // solda 18 padding + biraz sağ boşluk
                                const label = cutFit(labelRaw, avail, MAIN_FONT);

// Highlight kontrolü (TR lowercase)
                                const q = (highlight || '').toLocaleLowerCase('tr');
                                const isHL = !!q && (
                                    (p?.name || '').toLocaleLowerCase('tr').includes(q) ||
                                    clubRaw.toLocaleLowerCase('tr').includes(q) ||
                                    label.toLocaleLowerCase('tr').includes(q)
                                );

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
