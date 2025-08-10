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
export interface Player { seed:number; name:string; winner?:boolean; }
export interface Meta {
    teamNames?: [string, string];
    scores?: [number, number][];
    manual?: 0 | 1;
    // ↓ eklendi
    time?: string;   // "HH.MM" (örn. "14.00")
    court?: string;  // "1", "A", "3B" vb.
}

export interface Match  { players:Player[]; meta?:Meta; }

export type BracketType     = 'single'|'double'|'round_robin'|'group';
export type BracketStatus   = 'pending'|'in_progress'|'completed';
export type BracketCategory = 'main'|'sub';

export interface BracketSummary {
    id:number; title:string; type:BracketType; participants:number;
    progress:number; status:BracketStatus; category?:BracketCategory;
    parentId?:number|null;
}

/* Yardımcı: gelen JSON’un Match[][] olup olmadığını kontrol et */
const isMatrix = (x:unknown):x is Match[][] =>
    Array.isArray(x) && (x.length===0 || Array.isArray(x[0]));

/* =======================================================================
   useBracket – Tek turnuvanın (matris) verisini getir
   enabled=false => hiçbir fetch yapmaz, undefined döner
   ======================================================================= */
export function useBracket(
    id?:number, slug?:string, enabled:boolean=true,
){
    return useQuery<Match[][],Error>({
        queryKey:['bracket', slug ?? (id ?? 'active')],
        enabled,
        queryFn: async () => {
            let data:unknown;
            /* Sunucu isteği: */
            try {
                // const url = slug ? `bracket/${slug}` : (id ? `bracket/${id}` : 'bracket/');
                const url = `bracket/`;
                data = (await api.get<Match[][]>(url)).data;
            } catch { data = null; }

            /* Dev mock’ları */
            if(!data && import.meta.env.DEV && id===MOCK_SUB_ID) return mockBracketMatrix;
            if(!isMatrix(data)) throw new Error('Beklenmeyen JSON (Match[][] değil)');
            return data;
        },
        staleTime:30_000,
        retry:1,
        refetchOnWindowFocus:false,
    });
}

/* =======================================================================
   useBrackets – Dashboard listesi
   ======================================================================= */
export function useBrackets(){
    return useQuery<BracketSummary[],Error>({
        queryKey:['brackets'],
        queryFn:async()=>{
            let data:unknown;
            try{ data=(await api.get<BracketSummary[]>('brackets/')).data; }
            catch{ data=null; }
            if(!data && import.meta.env.DEV) return mockBrackets;
            if(!Array.isArray(data)) throw new Error('Beklenmeyen JSON (liste değil)');
            return data;
        },
        staleTime:0,
        refetchOnMount:'always',
        refetchOnWindowFocus:false,
    });
}
