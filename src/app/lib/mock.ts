/* ------------------------------------------------------------------
   Basit geliştirme verisi
------------------------------------------------------------------ */
import type { Match, BracketSummary } from '../hooks/useBracket';

/* ID sabitleri */
export const MOCK_MAIN_ID = 1000;
export const MOCK_SUB_ID  = 2000;

/* Ana + alt turnuva listesi (Dashboard) */
export const mockBrackets: BracketSummary[] = [
    {
        id: MOCK_MAIN_ID,
        title: '2025 İstanbul Şampiyonası',
        type: 'single',
        participants: 16,
        progress: 0,
        status: 'pending',
        category: 'main',
        parentId: null,
    },
    {
        id: MOCK_SUB_ID,
        title: 'Gençler (U16) – 55-65 kg',
        type: 'single',
        participants: 8,
        progress: 0,
        status: 'pending',
        category: 'sub',
        parentId: MOCK_MAIN_ID,
    },
];

/* Alt turnuvaya ait (boş) eşleşme matrisi */
export const mockBracketMatrix: Match[][] = [
    [
        { players: [{ seed: 1, name: 'Team 1' }, { seed: 4, name: 'Team 4' }] },
        { players: [{ seed: 3, name: 'Team 3' }, { seed: 2, name: 'Team 2' }] },
    ],
    [
        { players: [{ seed: 1, name: '?' }, { seed: 2, name: '?' }] },
    ],
];
