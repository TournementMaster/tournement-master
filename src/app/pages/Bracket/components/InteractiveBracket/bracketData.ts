// src/app/pages/Bracket/components/InteractiveBracket/bracketData.ts
import {useEffect, useRef} from 'react';
import { api } from '../../../../lib/api';
import type { Participant } from '../../../../hooks/usePlayers';
import type { Palette } from '../../../../context/themePalettes';

/* --------------------------------- Types --------------------------------- */
export interface Player {
    seed: number;
    name: string;
    club?: string;
    winner?: boolean;
    athleteId?: number | null;
}
export interface Meta {
    scores?: [number, number][];
    manual?: 0 | 1;
    time?: string;
    court?: string;
    matchNo?: number;
}
export interface Match {
    players: Player[];
    meta?: Meta;
}
export type Matrix = Match[][];

/* Backend DTOs (internal) */
type ApiAthlete = {
    id: number;
    first_name: string;
    last_name: string;
    birth_year: number;
    weight: string | number;
    gender: 'M' | 'F' | string;
    club: number | null;
};
type ApiMatchSet = { id: number; set_no: number; a1_score: number; a2_score: number; match: number };
type ApiMatch = {
    id: number;
    sets: ApiMatchSet[];
    round_no: number;
    position: number;
    court_no: number | null;
    scheduled_at: string | null;
    extra_note: string;
    sub_tournament: number;
    athlete1: number | null;
    athlete2: number | null;
    winner: number | null;
    match_no?: number | null;
};
type ClubRow = { id: number; name: string; city?: string };

type LoaderProps = {
    slug: string
    enabled: boolean
    refreshKey: number
    onBuilt: (matrix: Matrix, firstRoundParticipants: Participant[]) => void
    onAuthError?: (code: number) => void
    pollMs?: number // varsayılan 15sn
}

/* -------------------------------- Helpers -------------------------------- */
export function blank(): Match {
    return { players: [{ seed: 0, name: '—' }, { seed: 0, name: '—' }] };
}

export function seedOrder(size: number): number[] {
    if (size < 2) return [1];
    let prev = [1, 2];
    while (prev.length < size) {
        const n = prev.length * 2;
        const comp = prev.map((x) => n + 1 - x);
        const next: number[] = [];
        for (let i = 0; i < prev.length; i += 2) {
            const a = prev[i], b = prev[i + 1];
            const A = comp[i], B = comp[i + 1];
            next.push(a, A, B, b);
        }
        prev = next;
    }
    return prev;
}
export function nextPowerOfTwo(n: number) {
    let s = 1;
    while (s < n) s <<= 1;
    return Math.max(4, s);
}

export function samePlayersList(a: Participant[], b: Participant[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if ((a[i]?.name || '') !== (b[i]?.name || '')) return false;
        if ((a[i]?.club || '') !== (b[i]?.club || '')) return false;
    }
    return true;
}

/* Yerelden ilk turu kur */
export function buildMatrix(
    participants: Participant[],
    placementMap: Record<number, number> | null
): Matrix {
    const n = participants.length;
    const size = nextPowerOfTwo(n);
    const order = seedOrder(size);

    const slotToPlayer = new Map<number, Player>();
    for (const p of participants) {
        const slotSeed = placementMap?.[p.seed] ?? p.seed;
        slotToPlayer.set(slotSeed, { seed: p.seed, name: p.name, club: p.club });
    }

    const r0: Match[] = [];
    for (let i = 0; i < order.length; i += 2) {
        const a = slotToPlayer.get(order[i]) ?? { seed: 0, name: '—' };
        const b = slotToPlayer.get(order[i + 1]) ?? { seed: 0, name: '—' };
        r0.push({ players: [a, b] });
    }

    const rounds: Matrix = [r0];
    let games = size / 4;
    while (games >= 1) {
        rounds.push(Array(games).fill(0).map(blank));
        games /= 2;
    }
    return rounds;
}

/* Kazananları sonraki tura taşı */
export function propagate(matrix: Matrix, opts?: { autoByes?: boolean }): Matrix {
    const autoByes = opts?.autoByes ?? true;

    // 1) Derin kopya + üst turların oyuncularını temizle
    const mat: Matrix = matrix.map((r) =>
        r.map((m) => ({
            players: m.players.map((p) => ({ ...p })),
            meta: m.meta
                ? { ...m.meta, scores: m.meta.scores ? [...m.meta.scores] as [number, number][] : undefined }
                : undefined,
        }))
    );
    for (let r = 1; r < mat.length; r++) {
        for (let i = 0; i < mat[r].length; i++) {
            mat[r][i].players = [{ seed: 0, name: '—' }, { seed: 0, name: '—' }];
            mat[r][i].players[0].winner = undefined;
            mat[r][i].players[1].winner = undefined;
        }
    }

    // 2) Winner varsa üst tura yerleştir
    for (let r = 0; r < mat.length; r++) {
        mat[r].forEach((m, idx) => {
            const [p1, p2] = m.players;
            let winner: 0 | 1 | undefined;

            // Bye terfisi yalnızca autoByes açıkken
            if (autoByes && r === 0) {
                const aBye = p1.seed === 0 || p1.name === '—';
                const bBye = p2.seed === 0 || p2.name === '—';
                if (aBye && !bBye) winner = 1;
                else if (bBye && !aBye) winner = 0;
            }

            if (winner == null && m.meta?.manual != null) winner = m.meta.manual;
            if (winner == null && m.meta?.scores?.length) {
                const [a, b] = m.meta.scores[0];
                if (a !== b) winner = a > b ? 0 : 1;
            }

            if (winner != null) {
                m.players[winner] = { ...m.players[winner], winner: true };
                m.players[1 - winner] = { ...m.players[1 - winner], winner: false };

                if (r < mat.length - 1) {
                    const next = mat[r + 1][Math.floor(idx / 2)];
                    const moved = { ...m.players[winner] };
                    delete (moved ).winner;
                    next.players[idx % 2] = moved;
                }
            } else {
                m.players[0] = { ...m.players[0], winner: undefined };
                m.players[1] = { ...m.players[1], winner: undefined };
            }
        });
    }
    return mat;
}

/* Tema anahtarı çözümle */
export function resolveThemeKey(k: any): keyof Record<string, Palette> {
    switch (k) {
        case 'classic-dark':
        case 'classic-light':
            return 'classic';
        case 'modern-dark':
        case 'modern-light':
            return 'purple';
        case 'purple-orange':
            return 'orange';
        case 'black-white':
            return 'invert';
        case 'ocean':
            return 'ocean';
        case 'forest':
            return 'forest';
        case 'rose':
            return 'rose';
        case 'gold':
            return 'gold';
        case 'crimson':
            return 'crimson';
        case 'teal':
            return 'teal';
        case 'slate':
            return 'slate';
        default:
            return 'classic';
    }
}

/* ISO → HH.MM */
export function toHHMM(iso: string | null | undefined): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
}

/* ------------------------- Backend → Matrix builder ----------------------- */
export function buildFromBackend(
    athletes: ApiAthlete[],
    matches: ApiMatch[],
    clubs: ClubRow[]
): { matrix: Matrix; firstRound: Participant[] } {
    const clubMap = new Map<number, string>();
    clubs.forEach((c) => clubMap.set(c.id, c.name));

    const aMap = new Map<number, { name: string; club?: string }>();
    athletes.forEach((a) => {
        const name =
            (a.first_name || '').trim() ||
            `${a.first_name} ${a.last_name}`.trim() ||
            '—';
        const club = a.club != null ? clubMap.get(a.club) : undefined;
        aMap.set(a.id, { name, club });
    });

    const maxRound = matches.length ? Math.max(...matches.map((m) => m.round_no)) : 0;
    const matrix: Matrix = maxRound ? Array.from({ length: maxRound }, () => []) : [];

    for (let r = 1; r <= maxRound; r++) {
        const inRound = matches.filter((m) => m.round_no === r);

        // Aynı (round, position) için EN SON id'li kaydı tut
        const latestByPos = new Map<number, ApiMatch>();
        for (const m of inRound) {
            const prev = latestByPos.get(m.position);
            if (!prev || (m.id ?? 0) > (prev.id ?? 0)) latestByPos.set(m.position, m);
        }

        const positions = [...latestByPos.keys()];
        const maxPos = positions.length ? Math.max(...positions) : 0;
        matrix[r - 1] = Array.from({ length: maxPos }, () => blank());

        // pozisyona göre sırala ve doldur
        positions
            .sort((a, b) => a - b)
            .forEach((pos) => {
                const m = latestByPos.get(pos)!;

                const p1 = m.athlete1 ? aMap.get(m.athlete1) ?? { name: '—' } : { name: '—' };
                const p2 = m.athlete2 ? aMap.get(m.athlete2) ?? { name: '—' } : { name: '—' };

                const players: Player[] = [
                    { seed: 0, name: p1.name, club: p1.club, athleteId: m.athlete1 ?? null },
                    { seed: 0, name: p2.name, club: p2.club, athleteId: m.athlete2 ?? null },
                ];

                const meta: Meta = {};
                if (Array.isArray(m.sets) && m.sets.length)
                    meta.scores = m.sets.map((s) => [s.a1_score, s.a2_score]);

                const t = toHHMM(m.scheduled_at);
                if (t) meta.time = t;
                if (m.court_no != null) meta.court = String(m.court_no);
                if (typeof m.match_no === 'number' && Number.isFinite(m.match_no))
                    meta.matchNo = m.match_no;

                if (m.winner != null) {
                    if (m.winner === m.athlete1) {
                        players[0] = { ...players[0], winner: true };
                        players[1] = { ...players[1], winner: false };
                        meta.manual = 0;
                    } else if (m.winner === m.athlete2) {
                        players[1] = { ...players[1], winner: true };
                        players[0] = { ...players[0], winner: false };
                        meta.manual = 1;
                    }
                }

                matrix[r - 1][pos - 1] = { players, meta };
            });
    }

    const firstRound: Participant[] = (matrix[0] ?? []).flatMap((m, idx) => {
        const out: Participant[] = [];
        if (m.players[0]?.name && m.players[0].name !== '—')
            out.push({ name: m.players[0].name, club: m.players[0].club, seed: idx * 2 + 1 });
        if (m.players[1]?.name && m.players[1].name !== '—')
            out.push({ name: m.players[1].name, club: m.players[1].club, seed: idx * 2 + 2 });
        return out;
    });

    if (!matrix.length && athletes.length) {
        const fallbackParticipants: Participant[] = athletes.map((a, i) => ({
            name: (a.first_name || '').trim() || `${a.first_name} ${a.last_name}`.trim() || '—',
            club: a.club != null ? clubMap.get(a.club) : undefined,
            seed: i + 1,
        }));
        const mtx = buildMatrix(fallbackParticipants, null);
        return { matrix: mtx, firstRound: fallbackParticipants };
    }

    return { matrix, firstRound };
}

/* --------------------------- Backend data loader -------------------------- */
export function BackendBracketLoader({
                                         slug,
                                         enabled,
                                         refreshKey,
                                         onBuilt,
                                         pollMs = 15_000,
                                         onAuthError,
                                     }: {
    slug: string;
    enabled: boolean;
    refreshKey: number;
    onBuilt: (m: Matrix, p: Participant[]) => void;
    pollMs?: number;
    onAuthError?: (code: number) => void;
}) {
    // callback'leri ref'e al — efektin dependency’sini daralt
    const onBuiltRef = useRef(onBuilt);
    const onAuthErrRef = useRef(onAuthError);
    useEffect(() => { onBuiltRef.current = onBuilt }, [onBuilt]);
    useEffect(() => { onAuthErrRef.current = onAuthError }, [onAuthError]);

    // Tek interval + overlap koruması
    useEffect(() => {
        if (!slug || !enabled) return;

        let timer: number | null = null;
        let mounted = true;
        const inflightRef = { current: false };
        let abortCtrl: AbortController | null = null;

        const fetchAll = async () => {
            if (!mounted || inflightRef.current) return;
            if (document.hidden) return; // sekme gizliyken bekle

            inflightRef.current = true;
            abortCtrl?.abort();
            abortCtrl = new AbortController();
            try {
                const [athRes, matchRes, clubsRes] = await Promise.all([
                    api.get<ApiAthlete[]>(`subtournaments/${slug}/athletes/`, { signal: abortCtrl.signal }),
                    api.get<ApiMatch[]>(`subtournaments/${slug}/matches/`,  { signal: abortCtrl.signal }),
                    api.get<ClubRow[]>('clubs/', { signal: abortCtrl.signal }).catch(() => ({ data: [] as ClubRow[] })),
                ]);
                if (!mounted) return;
                const built = buildFromBackend(
                    Array.isArray(athRes.data) ? athRes.data : [],
                    Array.isArray(matchRes.data) ? matchRes.data : [],
                    Array.isArray(clubsRes.data) ? clubsRes.data : []
                );
                onBuiltRef.current?.(propagate(built.matrix, { autoByes: true }), built.firstRound);
            } catch (e: any) {
                const code = e?.response?.status;
                if (code) onAuthErrRef.current?.(code);
            } finally {
                inflightRef.current = false;
            }
        };

        // hemen bir kez çek
        void fetchAll();
        // 15 sn’de bir
        timer = window.setInterval(fetchAll, pollMs);
        // görünürlük değişince görünür olduğunda bir kez daha çek
        const onVis = () => { if (!document.hidden) void fetchAll(); };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            mounted = false;
            if (timer) window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVis);
            abortCtrl?.abort();
        };
    }, [slug, enabled, pollMs, refreshKey]);

    return null;
}
