export type ThemeKey =
    | 'orange'
    | 'purple'
    | 'classic'
    | 'invert'
    | 'ocean'
    | 'forest'
    | 'rose'
    | 'gold'
    | 'crimson'
    | 'teal'
    | 'slate';

export interface Palette {
    bg: string; bar: string; win: string; txt: string; glow1: string; glow2: string;
}

export const PALETTES: Record<ThemeKey, Palette> = {
    orange : { bg:'#ffe9d8', bar:'#8c3d00', win:'#ff7b00', txt:'#351a00',
        glow1:'#ffc29c', glow2:'#ff7b00' },
    purple : { bg:'#ede9fe', bar:'#4c1d95', win:'#7c3aed', txt:'#2e1065',
        glow1:'#c4b5fd', glow2:'#7c3aed' },
    classic: { bg:'#1e1f23', bar:'#3d3f46', win:'#f8fafc', txt:'#f8fafc',
        glow1:'#cfd2da', glow2:'#ffffff' },
    invert : { bg:'#ffffff', bar:'#999999', win:'#000000', txt:'#000000',
        glow1:'#7d7d7d', glow2:'#000000' },

    // Yeni paletler (daha canlı, kontrastlı)
    ocean  : { bg:'#e6f7ff', bar:'#0e7490', win:'#06b6d4', txt:'#083344',
        glow1:'#a5f3fc', glow2:'#06b6d4' },
    forest : { bg:'#ecfdf5', bar:'#065f46', win:'#10b981', txt:'#052e2b',
        glow1:'#a7f3d0', glow2:'#10b981' },
    rose   : { bg:'#fdf2f8', bar:'#9d174d', win:'#e11d48', txt:'#4a044e',
        glow1:'#fbcfe8', glow2:'#e11d48' },
    gold   : { bg:'#fffbeb', bar:'#92400e', win:'#f59e0b', txt:'#451a03',
        glow1:'#fde68a', glow2:'#f59e0b' },
    crimson: { bg:'#fff1f2', bar:'#7f1d1d', win:'#ef4444', txt:'#450a0a',
        glow1:'#fecdd3', glow2:'#ef4444' },
    teal   : { bg:'#f0fdfa', bar:'#115e59', win:'#14b8a6', txt:'#042f2e',
        glow1:'#99f6e4', glow2:'#14b8a6' },
    slate  : { bg:'#f1f5f9', bar:'#334155', win:'#64748b', txt:'#0f172a',
        glow1:'#cbd5e1', glow2:'#64748b' },
};
