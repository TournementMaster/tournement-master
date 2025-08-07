// themePalettes.ts – sadece sabitler
export type ThemeKey = 'orange' | 'purple' | 'classic' | 'invert';

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
};
