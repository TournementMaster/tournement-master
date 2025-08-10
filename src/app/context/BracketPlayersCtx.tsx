/* src/app/context/BracketPlayersCtx.tsx */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, type ReactNode } from 'react'
import type { PlayersCtx, Participant } from '../hooks/usePlayers'

// Context objemiz, başlangıçta null
export const PlayersContext = createContext<PlayersCtx | null>(null)

export function BracketPlayersProvider({ children }: { children: ReactNode }) {
    const [players, setPlayers] = useState<Participant[]>([])
    return (
        <PlayersContext.Provider value={{ players, setPlayers }}>
            {children}
        </PlayersContext.Provider>
    )
}
