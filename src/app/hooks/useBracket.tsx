/* src/app/hooks/useBracket.ts   (veya .tsx) */
import { useQuery } from '@tanstack/react-query';
import {api} from "../lib/api.tsx";

export interface Player { seed: number; name: string; winner?: boolean }
export interface Meta   { date?: string; time?: string; score?: string; winner?: number }
export type Match = { players: [Player, Player]; meta?: Meta };

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
