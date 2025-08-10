import { createContext, useContext, useState, type ReactNode } from 'react';

export interface BracketSettings {
    showScores: boolean;                 // skor açıkken time/court görünmez
    showTime:   boolean;                 // skor kapalı + açık ise time yaz
    showCourt:  boolean;                 // skor kapalı + açık ise court yaz
    showSeeds:  boolean;                 // seed numarasını kutu dışında göster
    placementMap: Record<number,number>|null; // seed → slotSeed yerleştirme
    version:    number;                  // yeniden çizim tetikleyici
}

const Ctx = createContext<{
    settings: BracketSettings;
    set:      (p: Partial<BracketSettings>) => void;
} | null>(null);

export function BracketSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<BracketSettings>({
        showScores: true,
        showTime:   true,
        showCourt:  true,
        showSeeds:  true,
        placementMap: null,
        version:    0,
    });
    return (
        <Ctx.Provider value={{ settings, set: p => setSettings(s => ({ ...s, ...p })) }}>
            {children}
        </Ctx.Provider>
    );
}

export const useSettings = () => {
    const c = useContext(Ctx);
    if (!c) throw new Error('useSettings dışarıda');
    return c;
};
