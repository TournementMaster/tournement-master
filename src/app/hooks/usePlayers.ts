// src/app/hooks/usePlayers.ts
import { useContext } from 'react'
import { PlayersContext } from '../context/BracketPlayersCtx'

// Katılımcı tipi (seed ve kulüp içerir)
export interface Participant {
    name: string
    club?: string
    seed: number
}

export interface PlayersCtx {
    players: Participant[]
    setPlayers: (players: Participant[]) => void
}

export function usePlayers(): PlayersCtx {
    const ctx = useContext(PlayersContext)
    if (!ctx) {
        throw new Error('usePlayers must be used within a <BracketPlayersProvider>')
    }
    return ctx
}
