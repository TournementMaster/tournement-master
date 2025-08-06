/* =========================================================================
   FILE: src/app/hooks/useBracket.tsx
   Tek ve çoklu turnuva verisini getiren iki React Query hook’u
   ========================================================================= */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/* --- Geliştirme mock’ları (yalnızca Vite dev sunucusunda) ------------- */
import {
    mockBracketMatrix,
    mockBrackets,
    MOCK_SUB_ID,
} from '../lib/mock';

/* =======================================================================
   Tip Tanımları
   ======================================================================= */

/** Her oyuncu / takım */
export interface Player {
    seed: number;
    name: string;
    winner?: boolean;
}

/**
 * Ek maç verisi – hepsi opsiyonel
 *  - `teamNames`   : Modal’da ad güncelleme
 *  - `scores`      : [[takım1, takım2], …]  (çoklu set’e hazır)
 *  - `manual`      : Manuel kazanan (0 veya 1)
 */
export interface Meta {
    teamNames?: [string, string];
    scores?: [number, number][];
    manual?: 0 | 1;
}

/** Tek maç (bracket kutusu) */
export interface Match {
    players: Player[];   // 2 elemanlı dizi, ama flexible olsun
    meta?: Meta;
}

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

/* -----------------------------------------------------------------------
   Yardımcı: gelen JSON’un Match[][] olup olmadığını hızlıca kontrol et
------------------------------------------------------------------------ */
const isMatrix = (x: unknown): x is Match[][] =>
    Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));

/* =======================================================================
   useBracket – Tek turnuvanın (matris) verisini getir
   ======================================================================= */
export function useBracket(id?: number) {
    return useQuery<Match[][], Error>({
        queryKey: ['bracket', id ?? 'active'],
        queryFn: async () => {
            let data: unknown;

            try {
                const url = id ? `bracket/${id}` : 'bracket/';
                data = (await api.get<Match[][]>(url)).data;
            } catch {
                data = null;
            }

            /* --- geliştirme mock’u (yalnız dev sunucusunda) --- */
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

/* =======================================================================
   useBrackets – Dashboard listesi
   ======================================================================= */
export function useBrackets() {
    return useQuery<BracketSummary[], Error>({
        queryKey: ['brackets'],
        queryFn: async () => {
            let data: unknown;

            try {
                data = (await api.get<BracketSummary[]>('brackets/')).data;
            } catch {
                data = null;
            }

            /* --- geliştirme mock’u --- */
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
