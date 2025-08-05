import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.tsx';

export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   { date?: string; time?: string; score?: string; winner?: number }
export type Match = { players: [Player, Player]; meta?: Meta };

export type BracketType = 'single' | 'double' | 'round_robin' | 'group';
export type BracketStatus = 'pending' | 'in_progress' | 'completed';
export type BracketCategory = 'main' | 'sub';

export interface BracketSummary {
    id: number;
    title: string;
    type: BracketType;
    participants: number;
    progress: number;      // 0..100
    status: BracketStatus;
    category?: BracketCategory;
    parentId?: number | null;
}

function isMatchMatrix(x: unknown): x is Match[][] {
    return Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));
}

/* Tek turnuva (çizim) */
export function useBracket() {
    return useQuery<Match[][], Error>({
        queryKey: ['bracket'],
        queryFn: async () => {
            const { data } = await api.get<Match[][]>('bracket/');
            if (!isMatchMatrix(data)) throw new Error('Beklenmeyen JSON (Match[][] değil)');
            return data;
        },
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
    });
}

/* Dashboard listesi */
export function useBrackets() {
    return useQuery<BracketSummary[], Error>({
        queryKey: ['brackets'],
        queryFn: async () => {
            const { data } = await api.get<BracketSummary[]>('brackets/');
            if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON (liste değil)');
            return data;
        },
        /* ← Yeni eklenen kaydı ilk dönüşte mutlaka görmek için */
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
}
