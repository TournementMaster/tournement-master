import { createContext, useContext, useState, type ReactNode } from 'react';

export type PlayersCtx = {
    players: string[];
    setPlayers: (x: string[]) => void;
};

const Ctx = createContext<PlayersCtx | null>(null);

export function BracketPlayersProvider({ children }: { children: ReactNode }) {
    const [players, setPlayers] = useState<string[]>([]);   // max 16

    return (
        <Ctx.Provider value={{ players, setPlayers }}>{children}</Ctx.Provider>
    );
}

export const usePlayers = () => {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('usePlayers dışarıda');
    return ctx;
};
