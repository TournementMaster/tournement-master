import { createContext, useContext, useState, type ReactNode } from 'react';

export interface BracketSettings {
    double:     boolean;   // Çift taraflı
    showScores: boolean;   // Puanları göster
}

const Ctx = createContext<{
    settings: BracketSettings;
    set:      (p: Partial<BracketSettings>) => void;
} | null>(null);

export function BracketSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<BracketSettings>({
        double: false,
        showScores: true,
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
