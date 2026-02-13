import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Tournament {
    id: number;
    title: string;
    season_year: number;
    city: string;
    venue: string;
    start_date: string;   // "YYYY-MM-DD"
    end_date: string;     // "YYYY-MM-DD"
    description: string;
    public_slug: string;
    public: boolean;
    created_at: string;   // ISO
    updated_at: string;   // ISO
    owner: number;
    editors: number[];
}


export function useTournaments(options?: { enabled?: boolean }) {
    const enabled = options?.enabled !== false;
    return useQuery<Tournament[], Error>({
        queryKey: ['tournaments'],
        enabled,
        queryFn: async () => {
            const { data } = await api.get<Tournament[]>('tournaments/');
            if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON (liste değil)');

            // sessionStorage güncelleme (onSuccess yerine burada)
            try {
                const idToSlug: Record<number, string> = {};
                const slugToId: Record<string, number> = {};
                for (const t of data) {
                    idToSlug[t.id] = t.public_slug;
                    slugToId[t.public_slug] = t.id;
                }
                sessionStorage.setItem('tournament_id_to_slug', JSON.stringify(idToSlug));
                sessionStorage.setItem('tournament_slug_to_id', JSON.stringify(slugToId));
            } catch {
                // sesssionStorage erişimi yoksa sessiz geç
            }

            return data;
        },
        // Dashboard açılışında hep en günceli al:
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        retry: false, // 500 hatalarında direkt boş state göster, retry yapma
    });
}

/** Giriş yapmamış kullanıcılar için public turnuva listesi (auth gerekmez) */
export function usePublicTournaments() {
    return useQuery<Tournament[], Error>({
        queryKey: ['tournaments', 'public'],
        queryFn: async () => {
            const { data } = await api.get<Tournament[]>('tournaments/public/');
            if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON');
            return data;
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export type LiveIndexItem = { slug: string; title: string };
export type LiveIndexResponse = { day: string; tournaments: LiveIndexItem[] };

/** Şu an canlı maçı olan public turnuvalar (giriş gerekmez) */
export function useLiveIndex(day?: string) {
    return useQuery<LiveIndexResponse, Error>({
        queryKey: ['live', 'index', day ?? 'today'],
        queryFn: async () => {
            const params = day ? { day } : {};
            const { data } = await api.get<LiveIndexResponse>('live/', { params });
            return data;
        },
        staleTime: 30 * 1000,
    });
}
