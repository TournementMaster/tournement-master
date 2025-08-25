import React, { createContext, useContext, useMemo, useState } from 'react';

export type PlacementMap = Record<number, number> | null;

export type BracketSettings = {
    placementMap: PlacementMap;
    version: number;

    // eski alanlar kalsın (render tarafından kullanılabilir):
    showScores: boolean;
    showTime: boolean;
    showCourt: boolean;
    showSeeds: boolean;

    // ✅ yeni
    showMatchNo: boolean;
};

const defaultSettings: BracketSettings = {
    placementMap: null,
    version: 1,

    showScores: false,
    showTime: true,
    showCourt: true,
    showSeeds: true,

    showMatchNo: true,
};

type CtxValue = {
    settings: BracketSettings;
    set: (patch: Partial<BracketSettings>) => void;
};

const Ctx = createContext<CtxValue | undefined>(undefined);

export function BracketSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<BracketSettings>(defaultSettings);

    const value = useMemo<CtxValue>(
        () => ({
            settings,
            set: (patch) =>
                setSettings((prev) => ({
                    ...prev,
                    ...patch,
                })),
        }),
        [settings]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): CtxValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useSettings must be used within BracketSettingsProvider');
    return ctx;
}
