/* =========================================================================
   BRACKET THEME CONTEXT – Mor ve Turuncu paletler
   ========================================================================= */
import {
    createContext, useContext, useState, type ReactNode,
    type Dispatch, type SetStateAction,
} from 'react';

/* ------ Tema tipi & palet ------ */
export type ThemeKey = 'orange' | 'purple';

export interface Palette {
    bg:    string;
    bar:   string;
    win:   string;
    txt:   string;
    glow1: string;
    glow2: string;
}

const THEMES: Record<ThemeKey, Palette> = {
    orange: {
        bg:'#ffe9d8', bar:'#8c3d00', win:'#ff7b00', txt:'#351a00',
        glow1:'#ffc29c', glow2:'#ff7b00',
    },
    purple: {
        bg:'#ede9fe', bar:'#4c1d95', win:'#7c3aed', txt:'#2e1065',
        glow1:'#c4b5fd', glow2:'#7c3aed',
    },
};

/* ------ Context'ler ------ */
const BracketThemeCtx = createContext<Palette>(THEMES.orange);
const ThemeSetterCtx  = createContext<Dispatch<SetStateAction<ThemeKey>>>(()=>{});

export const useBracketTheme = () => useContext(BracketThemeCtx);
export const useSetTheme     = () => useContext(ThemeSetterCtx);

/* ------ Provider ------ */
export function BracketThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeKey>('orange');
    return (
        <BracketThemeCtx.Provider value={THEMES[theme]}>
            <ThemeSetterCtx.Provider value={setTheme}>
                {children}
            </ThemeSetterCtx.Provider>
        </BracketThemeCtx.Provider>
    );
}
