// src/app/hooks/usePlayers.ts
import { useContext } from 'react'
import { PlayersContext } from '../context/BracketPlayersCtx'

// Hook’un dışarı sunduğu tip
export interface PlayersCtx {
    players: string[]
    setPlayers: (players: string[]) => void
}

// Gerçek hook: Provider içinde kullanılmalı
export function usePlayers(): PlayersCtx {
    const ctx = useContext(PlayersContext)
    if (!ctx) {
        throw new Error('usePlayers must be used within a <BracketPlayersProvider>')
    }
    return ctx
}
