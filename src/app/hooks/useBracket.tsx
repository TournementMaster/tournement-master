/* ------------------------------------------------------------------
   Tek hook – hem çizim hem liste için
------------------------------------------------------------------ */
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/* MOCK */
import {
    mockBracketMatrix,
    mockBrackets,
    MOCK_SUB_ID,
} from '../lib/mock';

/* ---------------- Tipler ---------------- */
export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   {
    date?:   string;
    time?:   string;
    score?:  string;
    winner?: number;
    /** round puanları – en fazla 6 elemana kadar */
     scores?: number[];
}
export type Match = { players: [Player, Player]; meta?: Meta };

export type BracketType     = 'single' | 'double' | 'round_robin' | 'group';
export type BracketStatus   = 'pending' | 'in_progress' | 'completed';
export type BracketCategory = 'main' | 'sub';

export interface BracketSummary {
    id: number;
    title: string;
    type: BracketType;
    participants: number;
    progress: number;
    status: BracketStatus;
    category?: BracketCategory;
    parentId?: number | null;
}

/* ---------------- Guard ---------------- */
const isMatrix = (x: unknown): x is Match[][] =>
    Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));

/* ========================================================================
   useBracket – tek turnuva
======================================================================== */
export function useBracket(id?: number) {
    return useQuery<Match[][], Error>({
        queryKey: ['bracket', id ?? 'active'],
        queryFn: async () => {
            let data: unknown;

            try {
                const url = id ? `bracket/${id}` : 'bracket/';
                data = (await api.get<Match[][]>(url)).data;
            } catch { data = null; }

            /* dev mock */
            if (!data && import.meta.env.DEV && id === MOCK_SUB_ID)
                return mockBracketMatrix;

            if (!isMatrix(data))
                throw new Error('Beklenmeyen JSON (Match[][] değil)');

            return data;
        },
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
    });
}

/* ========================================================================
   useBrackets – Dashboard listesi
======================================================================== */
export function useBrackets() {
    return useQuery<BracketSummary[], Error>({
        queryKey: ['brackets'],
        queryFn: async () => {
            let data: unknown;

            try {
                data = (await api.get<BracketSummary[]>('brackets/')).data;
            } catch { data = null; }

            if (!data && import.meta.env.DEV) return mockBrackets;
            if (!Array.isArray(data))
                throw new Error('Beklenmeyen JSON (liste değil)');

            return data;
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
}
