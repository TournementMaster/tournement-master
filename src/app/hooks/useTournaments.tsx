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


export function useTournaments() {
    return useQuery<Tournament[], Error>({
        queryKey: ['tournaments'],
        queryFn: async () => {
            const { data } = await api.get<Tournament[]>('tournaments/');
            if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON (liste değil)');
            return data;
        },
        // Dashboard açılışında hep en günceli al:
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,

        onSuccess: (list: any) => {
            try {
                const idToSlug: Record<number, string> = {};
                const slugToId: Record<string, number> = {};
                for (const t of list) {
                    idToSlug[t.id] = t.public_slug;
                    slugToId[t.public_slug] = t.id;
                }
                sessionStorage.setItem('tournament_id_to_slug', JSON.stringify(idToSlug));
                sessionStorage.setItem('tournament_slug_to_id', JSON.stringify(slugToId));
            } catch {
                // sesssionStorage erişimi yoksa sessiz geç
            }
        },
    });
}
