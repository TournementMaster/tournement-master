import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import {useState} from "react";
import {type Meta, useBracket} from "../../../hooks/useBracket.tsx";

const H = 80, GAP = 30, V = 40, PAD = 8, GLOW = '#38bdf8';
const TEXT = { fill: '#e5e7eb', fontSize: 9 };

export default function InteractiveBracket() {
    const { rounds, setRounds } = useBracket();
    const [sel, setSel] = useState<{ r: number; m: number } | null>(null);

    const layout = rounds.map((rd, r) => {
        const s = V * 2 ** r;
        return rd.map((_, m) => {
            const mid = V + s + m * s * 2;
            return { mid, y1: mid - s / 2, y2: mid + s / 2 };
        });
    });

    const svgH = layout[0]?.[layout[0].length - 1]?.mid + V || 0;

    const persist = (meta: Meta) => {
        if (!sel) return;
        setRounds(prev =>
            prev.map((rd, r) =>
                rd.map((mt, m) => (r === sel.r && m === sel.m ? { ...mt, meta } : mt))
            )
        );
        setSel(null);
    };

    return (
        <div className="w-full h-screen bg-[#1e1f23]">
            {/* hover-glow stil bloğu */}
            <style>
            {`.click-area{stroke:transparent;stroke-width:2;transition:stroke .12s,filter .12s;}
          .click-area:hover{stroke:${GLOW};filter:drop-shadow(0 0 6px ${GLOW});}`}
    </style>

    <TransformWrapper wheel={{ step: 80 }}>
    <TransformComponent>
        <svg width={720} height={svgH} role="img">
        {rounds.map((rd, r) => {
                const x = 20 + r * (H + GAP);
                const nx = x + H + GAP;

                return rd.map((mt, m) => {
                    const { mid, y1, y2 } = layout[r][m];
                    return (
                        <g key={`${r}-${m}`} stroke="#e5e7eb" strokeWidth={2} fill="none">
                        {/* görünmez – hover’da parlayan – tıklanabilir alan */}
                        <rect
                    className="click-area"
                    x={x - PAD / 2}
                    y={y1 - PAD / 2}
                    width={H + PAD}
                    height={y2 - y1 + PAD}
                    fill="transparent"
                    cursor="pointer"
                    onClick={() => setSel({ r, m })}
                    />

                    {/* çizgiler */}
                    <line x1={x} x2={x + H} y1={y1} y2={y1} />
                    <line x1={x} x2={x + H} y1={y2} y2={y2} />
                    <line x1={x + H} x2={x + H} y1={y1} y2={y2} />
                    {r < rounds.length - 1 && (
                        <line x1={x + H} x2={nx} y1={mid} y2={mid} />
                    )}

                    {/* oyuncu isimleri */}
                    {mt.players.map((p, i) => (
                        <text key={i} x={x + 6} y={(i ? y2 : y1) - 6} {...TEXT}>
                        {p.seed} {p.name}
                        {p.winner && ' ✅'}
                        </text>
                    ))}
                    </g>
                );
                });
            })}
        </svg>
        </TransformComponent>
        </TransformWrapper>

    {sel && (
        <MatchModal
            match={rounds[sel.r][sel.m]}
        onSave={persist}
        onClose={() => setSel(null)}
        />
    )}
    </div>
);
}
