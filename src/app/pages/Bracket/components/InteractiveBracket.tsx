import { useEffect, useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import {type Match, type Meta, useBracket} from "../../../hooks/useBracket.tsx";

const H = 80, GAP = 30, V = 40, PAD = 8;
const GLOW = '#38bdf8';
const TEXT = { fill: '#e5e7eb', fontSize: 9 } as const;

export default function InteractiveBracket() {
    /* 1) Veri çekme */
    const { data, isLoading, isError } = useBracket();

    /* 2) Yerel state (düzenlenebilir kopya) */
    const [rounds, setRounds] = useState<Match[][]>([]);
    const [selected, setSelected] = useState<{ r: number; m: number } | null>(null);

    /* 3) API verisi geldiğinde kopyala */
    useEffect(() => { if (data) setRounds(data); }, [data]);

    /* 4) Koordinat hesaplama — HER render’da çağrılır, boş dizide de sorun yok */
    const layout = useMemo(() => {
        return rounds.map((rd, r) => {
            const s = V * 2 ** r;
            return rd.map((_, m) => {
                const mid = V + s + m * s * 2;
                return { mid, y1: mid - s / 2, y2: mid + s / 2 };
            });
        });
    }, [rounds]);

    const svgH = layout.length
        ? layout[0][layout[0].length - 1].mid + V
        : 0;

    /* 5) KOŞULLU GÖRÜNÜMLER — Hook’ların hepsi yukarıda zaten çağrıldı */
    if (isLoading)
        return <div className="flex h-screen items-center justify-center text-gray-400">Yükleniyor…</div>;

    if (isError || !rounds.length)
        return <div className="flex h-screen items-center justify-center text-red-400">Bracket verisi alınamadı.</div>;

    /* 6) Modal kaydet */
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

    /* 7) JSX çıktısı */
    return (
        <div className="w-full h-screen">
            <style>{`
        .click-area{stroke:transparent;stroke-width:2;transition:stroke .12s,filter .12s;}
        .click-area:hover{stroke:${GLOW};filter:drop-shadow(0 0 6px ${GLOW});}
      `}</style>

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
                                        <rect
                                            className="click-area"
                                            x={x - PAD / 2}
                                            y={y1 - PAD / 2}
                                            width={H + PAD}
                                            height={y2 - y1 + PAD}
                                            fill="transparent"
                                            cursor="pointer"
                                            onClick={() => setSelected({ r, m })}
                                        />
                                        <line x1={x} x2={x + H} y1={y1} y2={y1} />
                                        <line x1={x} x2={x + H} y1={y2} y2={y2} />
                                        <line x1={x + H} x2={x + H} y1={y1} y2={y2} />
                                        {r < rounds.length - 1 && (
                                            <line x1={x + H} x2={nx} y1={mid} y2={mid} />
                                        )}
                                        {mt.players.map((p, i) => (
                                            <text key={i} x={x + 6} y={(i ? y2 : y1) - 6} {...TEXT}>
                                                {p.seed} {p.name}{p.winner && ' ✅'}
                                            </text>
                                        ))}
                                    </g>
                                );
                            });
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

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
