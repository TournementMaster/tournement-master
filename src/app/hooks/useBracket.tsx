/* src/app/hooks/useBracket.ts   (veya .tsx) */
import { useQuery } from '@tanstack/react-query';
import {api} from "../lib/api.tsx";

export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   { date?: string; time?: string; score?: string; winner?: number }
export type Match = { players: [Player, Player]; meta?: Meta };
export type BracketType = 'single' | 'double' | 'round_robin' | 'group';
export type BracketStatus = 'pending' | 'in_progress' | 'completed';
export interface BracketSummary {
    id: number;
    title: string;
    type: BracketType;
    participants: number;
    progress: number; // 0..100
    status: BracketStatus;
}

export function useBracket() {
    return useQuery<Match[][], Error>({
        queryKey: ['bracket'],
        queryFn: async () => {
            const { data } = await api.get<Match[][]>('bracket/');
            console.log(data);
            return data;
        },

        staleTime: 60_000,   // 1 dk boyunca yeniden fetch etmez
        retry: 1,            // ilk hata → 1 kez daha dener
    });
}
/** Backend hazır değilse UI'yi görebilmen için örnek veri */
const MOCK: BracketSummary[] = [
    { id: 1, title: 'Untitled Bracket', type: 'single', participants: 4,  progress: 100, status: 'completed' },
    { id: 2, title: 'Campus Cup',       type: 'double', participants: 8,  progress: 40,  status: 'in_progress' },
    { id: 3, title: 'Dojo League',      type: 'round_robin', participants: 6, progress: 0, status: 'pending' },
    { id: 4, title: 'Group Stage Test', type: 'group',  participants: 12, progress: 75, status: 'in_progress' },
];
export function useBrackets() {
    return useQuery<BracketSummary[], Error>({
        queryKey: ['brackets'],
        queryFn: async () => {
            try {
                const { data } = await api.get<BracketSummary[]>('brackets/');
                if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON');
                return data;
            } catch (err) {
                console.warn('brackets(): backend erişilemedi, MOCK veriye düşüldü.', err);
                return MOCK;
            }
        },
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });
}