// themePalettes.ts – sabitler
export type ThemeKey =
    | 'orange' | 'purple' | 'classic' | 'invert'
    | 'ocean'  | 'forest' | 'rose'    | 'gold'
    | 'steel'  | 'sky'    | 'mint';

export interface Palette {
    bg:string; bar:string; win:string; txt:string; glow1:string; glow2:string;
}

export const PALETTES:Record<ThemeKey,Palette> = {
    orange : { bg:'#ffe9d8', bar:'#8c3d00', win:'#ff7b00', txt:'#351a00',
        glow1:'#ffc29c', glow2:'#ff7b00' },
    purple : { bg:'#ede9fe', bar:'#4c1d95', win:'#7c3aed', txt:'#2e1065',
        glow1:'#c4b5fd', glow2:'#7c3aed' },
    classic: { bg:'#1e1f23', bar:'#3d3f46', win:'#f8fafc', txt:'#f8fafc',
        glow1:'#cfd2da', glow2:'#ffffff' },
    invert : { bg:'#ffffff', bar:'#999999', win:'#000000', txt:'#000000',
        glow1:'#7d7d7d', glow2:'#000000' },

    /* Yeni renkler */
    ocean  : { bg:'#e6f7ff', bar:'#0e7490', win:'#0284c7', txt:'#072b3a', glow1:'#7dd3fc', glow2:'#0284c7' },
    forest : { bg:'#ebfbee', bar:'#166534', win:'#22c55e', txt:'#052e16', glow1:'#86efac', glow2:'#22c55e' },
    rose   : { bg:'#fff1f2', bar:'#9f1239', win:'#e11d48', txt:'#4c0519', glow1:'#fda4af', glow2:'#e11d48' },
    gold   : { bg:'#fff7e6', bar:'#92400e', win:'#f59e0b', txt:'#3b2404', glow1:'#fde68a', glow2:'#f59e0b' },
    steel  : { bg:'#eef2f7', bar:'#334155', win:'#475569', txt:'#0f172a', glow1:'#cbd5e1', glow2:'#475569' },
    sky    : { bg:'#eff6ff', bar:'#1d4ed8', win:'#3b82f6', txt:'#0a1a4b', glow1:'#93c5fd', glow2:'#3b82f6' },
    mint   : { bg:'#ecfdf5', bar:'#0f766e', win:'#14b8a6', txt:'#064e3b', glow1:'#99f6e4', glow2:'#14b8a6' },
};
