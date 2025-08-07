// src/app/context/BracketThemeContext.tsx
/* eslint-disable react-refresh/only-export-components */
/* Fast Refresh kuralı: bu dosyada sadece component export olmayacağı için
   kuralı dosya bazında kapatıyoruz. */

import {
    createContext,
    useContext,
    useState,
    type ReactNode,
    type Dispatch,
    type SetStateAction,
} from 'react';

/** Tema seçenekleri */
export type BracketThemeKey =
    | 'classic-dark'
    | 'classic-light'
    | 'modern-dark'
    | 'modern-light'
    | 'purple-orange'
    | 'black-white';

/** Context’in tuttuğu değer ve setter tipi */
interface BracketThemeContextType {
    theme:    BracketThemeKey;
    setTheme: Dispatch<SetStateAction<BracketThemeKey>>;
}

/** Context’in kendisi */
const BracketThemeContext =
    createContext<BracketThemeContextType | undefined>(undefined);

/**
 * Sağladığı `theme` ve `setTheme` ile tüm uygulamada
 * tema değiştirmeyi mümkün kılar.
 */
export function BracketThemeProvider({ children }: { children: ReactNode }) {
       // Başlangıç temasını açık renkli şablon yapıyoruz:
           const [theme, setTheme] = useState<BracketThemeKey>('classic-light');

    return (
        <BracketThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </BracketThemeContext.Provider>
    );
}

/**
 * Şu anki temayı döner.
 * Mutlaka <BracketThemeProvider> içinde çağrılmalıdır.
 */
export function useBracketTheme(): BracketThemeKey {
    const ctx = useContext(BracketThemeContext);
    if (!ctx) {
        throw new Error(
            'useBracketTheme must be used within a BracketThemeProvider'
        );
    }
    return ctx.theme;
}

/**
 * Temayı değiştirmek için setter fonksiyonunu döner.
 * Mutlaka <BracketThemeProvider> içinde çağrılmalıdır.
 */
export function useSetTheme(): Dispatch<SetStateAction<BracketThemeKey>> {
    const ctx = useContext(BracketThemeContext);
    if (!ctx) {
        throw new Error(
            'useSetTheme must be used within a BracketThemeProvider'
        );
    }
    return ctx.setTheme;
}
