import { useState } from 'react';

export type Player = { seed: number; name: string; winner?: boolean };
export type Meta   = { date?: string; time?: string; score?: string; winner?: number };
export type Match  = { players: [Player, Player]; meta?: Meta };

/* -- static demo rounds ----------------------------------- */
const INITIAL: Match[][] = [
    [
        { players: [{ seed: 1, name: 'Team 1', winner: true }, { seed: 16, name: 'Team 16' }] },
        { players: [{ seed: 8, name: 'Team 8', winner: true }, { seed: 9, name: 'Team 9' }] },
        { players: [{ seed: 5, name: 'Team 5' }, { seed: 12, name: 'Team 12', winner: true }] },
        { players: [{ seed: 4, name: 'Team 4' }, { seed: 13, name: 'Team 13', winner: true }] },
        { players: [{ seed: 3, name: 'Team 3' }, { seed: 14, name: 'Team 14' }] },
        { players: [{ seed: 6, name: 'Team 6' }, { seed: 11, name: 'Team 11' }] },
        { players: [{ seed: 7, name: 'Team 7' }, { seed: 10, name: 'Team 10' }] },
        { players: [{ seed: 2, name: 'Team 2' }, { seed: 15, name: 'Team 15' }] },
    ],
    [
        { players: [{ seed: 1, name: 'Team 1', winner: true }, { seed: 8, name: 'Team 8' }] },
        { players: [{ seed: 12, name: 'Team 12', winner: true }, { seed: 13, name: 'Team 13' }] },
        { players: [{ seed: 3, name: 'Team 3' }, { seed: 6, name: 'Team 6' }] },
        { players: [{ seed: 7, name: 'Team 7' }, { seed: 2, name: 'Team 2' }] },
    ],
    [
        { players: [{ seed: 1, name: 'Team 1', winner: true }, { seed: 12, name: 'Team 12' }] },
        { players: [{ seed: 3, name: 'Team 3' }, { seed: 7, name: 'Team 7' }] },
    ],
    [
        { players: [{ seed: 1, name: 'Team 1', winner: true }, { seed: 3, name: 'Team 3' }] },
    ],
];

export function useBracket() {
    const [rounds, setRounds] = useState<Match[][]>(INITIAL);
    return { rounds, setRounds };
}
