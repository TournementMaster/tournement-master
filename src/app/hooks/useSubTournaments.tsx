import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SubTournament {
    id: number;
    title: string;
    description: string;
    age_min: number;   // ör: 65535
    age_max: number;   // ör: 65535
    weight_min: string; // ör: "-"
    weight_max: string; // ör: "22."
    gender: 'M' | 'F' | 'O' | string;
    public: boolean;
    public_slug: string;
    tournament: number; // parent id
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
