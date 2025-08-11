import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SubTournament {
    id: number;
    title: string;
    description: string;
    age_min: number;
    age_max: number;
    weight_min: string;
    weight_max: string;
    gender: 'M' | 'F' | 'O' | string;
    public: boolean;
    public_slug: string;
    tournament: number;
    created_at?: string;     // ← sıralama için opsiyonel
}

export function useSubTournaments(publicSlug: string | undefined) {
    return useQuery<SubTournament[], Error>({
        queryKey: ['subtournaments', publicSlug],
        enabled: !!publicSlug,
        queryFn: async () => {
            const { data } = await api.get<SubTournament[]>(
                `tournaments/${publicSlug}/subtournaments`
            );
            if (!Array.isArray(data)) throw new Error('Beklenmeyen yanıtlama (liste değil)');
            return data;
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
}
