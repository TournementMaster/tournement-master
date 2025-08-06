import {
    createContext, useContext, useState, type ReactNode, type Dispatch,
    type SetStateAction,
} from 'react';

/* ------------------ Tema tipi & veriler ------------------ */
export type ThemeKey = 'blue-green' | 'light-green' | 'classic' | 'orange';

export interface Palette {
    bg:    string;   // kutu dolgusu
    bar:   string;   // sol ince bar + çizgiler
    win:   string;   // kazanan barı
    txt:   string;   // yazı rengi
    glow1: string;   // hover başlangıç rengi
    glow2: string;   // hover bitiş rengi
}

const THEMES: Record<ThemeKey, Palette> = {
    'blue-green': {
        bg:'#f2f2f2', bar:'#111', win:'#22b14c', txt:'#000',
        glow1:'#38bdf8', glow2:'#22b14c',
    },
    'light-green': {
        bg:'#e8fbe8', bar:'#0b640b', win:'#47d847', txt:'#083308',
        glow1:'#9cf8a4', glow2:'#47d847',
    },
    classic: {
        bg:'#ffffff', bar:'#000000', win:'#000000', txt:'#000',
        glow1:'#bfbfbf', glow2:'#000000',
    },
    orange: {
        bg:'#ffe9d8', bar:'#8c3d00', win:'#ff7b00', txt:'#351a00',
        glow1:'#ffc29c', glow2:'#ff7b00',
    },
};

/* ------------------ Context'ler ------------------ */
const BracketThemeCtx = createContext<Palette>(THEMES['blue-green']);
const ThemeSetterCtx  = createContext<Dispatch<SetStateAction<ThemeKey>>>(()=>{});

export const useBracketTheme = () => useContext(BracketThemeCtx);
export const useSetTheme     = () => useContext(ThemeSetterCtx);

/* ------------------ Provider ------------------ */
export function BracketThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeKey>('blue-green');
    return (
        <BracketThemeCtx.Provider value={THEMES[theme]}>
            <ThemeSetterCtx.Provider value={setTheme}>
                {children}
            </ThemeSetterCtx.Provider>
        </BracketThemeCtx.Provider>
    );
}
