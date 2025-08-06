/* =========================================================================
   INTERACTIVE BRACKET – hover glow, puan gösterimi, tema uyumlu
   ========================================================================= */

import { memo, useEffect, useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import { useBracket, type Match, type Meta } from '../../../hooks/useBracket';
import { useBracketTheme } from '../../../context/BracketThemeContext';

const W=350, GAP=124, H=80, BASE=H, R=12;
type Pos = { mid:number; y1:number; y2:number };
type Matrix = Match[][];

/* ---- Yardımcı: kazananı üst tura taşı ---- */
function recompute(src:Matrix):Matrix{
    const rounds:Matrix=src.map(rd=>rd.map(m=>({
        ...m,
        players:m.players.map(p=>({...p})),
    })));

    for(let r=0;r<rounds.length-1;r++){
        rounds[r].forEach((m,i)=>{
            const [a=0,b=0]=m.meta?.scores?.[0]??[];
            const auto=a!==b? (a>b?0:1):undefined;
            const win= m.meta?.manual ?? auto;
            m.players.forEach((p,idx)=>p.winner=win===idx);
            if(win!==undefined){
                rounds[r+1][Math.floor(i/2)].players[i%2]={...m.players[win]};
            }
        });
    }
    return rounds;
}

export default memo(function InteractiveBracket({bracketId, bracketSlug, }: { bracketId?: number; bracketSlug?: string }) {
    const palette=useBracketTheme();
    const {data,isLoading,isError,refetch}=useBracket(bracketId, bracketSlug);
    const [rounds,setRounds]=useState<Matrix>([]);
    const [sel,setSel]      =useState<{r:number;m:number}|null>(null);

    useEffect(()=>{ if(Array.isArray(data)) setRounds(recompute(data)); },[data]);

    const layout:Pos[][]=useMemo(()=>rounds.map((rd,r)=>{
        const span=BASE<<r;
        return rd.map((_,m)=>{
            const mid=BASE+span+m*span*2;
            return{ mid, y1:mid-span/2, y2:mid+span/2 };
        });
    }),[rounds]);

    const svgH=layout.length?layout[0].at(-1)!.mid+BASE:800;
    const svgW=20+rounds.length*(W+GAP)+200;

    const saveMeta=(meta:Meta)=>{
        if(!sel) return;
        setRounds(prev=>{
            const c=prev.map(rd=>rd.map(m=>({...m})));
            c[sel.r][sel.m]={...c[sel.r][sel.m], meta};
            /* İsim güncellendi mi? */
            if((meta as any).teamNames){
                const [n0,n1]=(meta as any).teamNames as [string,string];
                c[sel.r][sel.m].players[0].name=n0;
                c[sel.r][sel.m].players[1].name=n1;
            }
            return recompute(c);
        });
        setSel(null);
    };

    if(isLoading)      return <Status t="Yükleniyor…"/>;
    if(isError)        return <Status t="Veri alınamadı." f={refetch}/>;
    if(!rounds.length) return <Status t="Gösterilecek eşleşme yok."/>;

    return(
        <div className="relative">
            <TransformWrapper wheel={{step:120}} minScale={0.4} maxScale={3.5}>
                <TransformComponent wrapperClass="min-w-fit">
                    <svg width={svgW} height={svgH}>
                        <defs>
                            <style>{`
                .rect{fill:${palette.bg}}
                .bar {fill:${palette.bar}}
                .txt {font:600 20px/1 Inter,sans-serif;fill:${palette.txt};
                      dominant-baseline:middle}
                .mid {stroke:${palette.bar};stroke-width:1.5}
                .ln  {stroke:white;stroke-width:1.5;vector-effect:non-scaling-stroke}
                .win {fill:${palette.win}}
                .outline{stroke:url(#g);fill:none;stroke-width:0}
                .hit:hover + .outline{stroke-width:4;
                                      filter:drop-shadow(0 0 8px ${palette.glow2})}
              `}</style>
                            <linearGradient id="g" x1="0" x2="1">
                                <stop offset="0%" stopColor={palette.glow1}/>
                                <stop offset="100%" stopColor={palette.glow2}/>
                            </linearGradient>
                        </defs>

                        {rounds.map((rd,r)=>{
                            const x=20+r*(W+GAP);
                            const nx=x+W+GAP;

                            return rd.map((m,i)=>{
                                const {mid,y1,y2}=layout[r][i];
                                const score=m.meta?.scores?.[0];

                                return(
                                    <g key={`${r}-${i}`}>
                                        {/* Kutular */}
                                        <rect className="rect" x={x} y={mid-H/2} width={W} height={H} rx={R}/>
                                        <rect className="bar"  x={x-8} y={mid-H/2} width={8} height={H} rx={R}/>
                                        {m.players.find(p=>p.winner)&&(
                                            <rect className="win" x={x+W} y={mid-H/2} width={8} height={H} rx={R}/>
                                        )}
                                        <line className="mid" x1={x} x2={x+W} y1={mid} y2={mid}/>

                                        {/* İsim + puan */}
                                        {m.players.map((p,idx)=>(
                                            <>
                                                <text key={'n'+idx} className="txt"
                                                      x={x+22} y={mid+(idx?24:-24)}>{p.name}</text>
                                                {score && (
                                                    <text key={'s'+idx} className="txt"
                                                          x={x+W-32} y={mid+(idx?24:-24)}
                                                          textAnchor="end" fontSize={16} fill="#fff">
                                                        {score[idx]}
                                                    </text>
                                                )}
                                            </>
                                        ))}

                                        {/* Bağlantılar */}
                                        <line className="ln" x1={x-8} y1={y1} x2={x-8} y2={y2}/>
                                        <line className="ln" x1={x-8} y1={mid} x2={x} y2={mid}/>
                                        {r<rounds.length-1&&(
                                            <line className="ln" x1={x+W+8} y1={mid} x2={nx-8} y2={mid}/>
                                        )}

                                        {/* Hit-box + glow */}
                                        <rect
                                            className="hit"
                                            x={x} y={mid-H/2}
                                            width={W} height={H}
                                            fill="transparent" cursor="pointer"
                                            onClick={()=>setSel({r,m:i})}/>
                                        <rect className="outline"
                                              x={x-8} y={mid-H/2}
                                              width={W+16} height={H} rx={R+2}/>
                                    </g>
                                );
                            });
                        })}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {/* Modal */}
            {sel&&(
                <MatchModal match={rounds[sel.r][sel.m]} onSave={saveMeta} onClose={()=>setSel(null)}/>
            )}
        </div>
    );
});

/* ---- Durum Bileşeni ---- */
function Status({t,f}:{t:string;f?:()=>void}){
    return(
        <div className="flex h-[60vh] items-center justify-center gap-6">
            <span className="text-gray-400 text-2xl">{t}</span>
            {f&&<button onClick={f} className="px-6 py-2 bg-blue-600 text-xl rounded">↻</button>}
        </div>
    );
}
