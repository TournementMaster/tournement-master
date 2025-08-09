// src/app/context/BracketThemeContext.tsx
/* eslint-disable react-refresh/only-export-components */
import {
    createContext, useContext, useState,
    type ReactNode, type Dispatch, type SetStateAction,
} from 'react';

export type BracketThemeKey =
    | 'classic-dark' | 'classic-light'
    | 'modern-dark'  | 'modern-light'
    | 'purple-orange'| 'black-white'
    // yeni alternatifler
    | 'ocean' | 'forest' | 'rose' | 'gold' | 'crimson' | 'teal' | 'slate';

interface BracketThemeContextType {
    theme: BracketThemeKey;
    setTheme: Dispatch<SetStateAction<BracketThemeKey>>;
}

const BracketThemeContext =
    createContext<BracketThemeContextType | undefined>(undefined);

export function BracketThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<BracketThemeKey>('classic-light');
    return (
        <BracketThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </BracketThemeContext.Provider>
    );
}

export function useBracketTheme(): BracketThemeKey {
    const ctx = useContext(BracketThemeContext);
    if (!ctx) throw new Error('useBracketTheme must be used within a BracketThemeProvider');
    return ctx.theme;
}
export function useSetTheme(): Dispatch<SetStateAction<BracketThemeKey>> {
    const ctx = useContext(BracketThemeContext);
    if (!ctx) throw new Error('useSetTheme must be used within a BracketThemeProvider');
    return ctx.setTheme;
}
