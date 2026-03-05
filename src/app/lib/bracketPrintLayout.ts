export type PrintPageSize = 'A4' | 'A3';
export type PrintOrientation = 'portrait' | 'landscape';
export type PrintDensity = 'comfortable' | 'compact' | 'dense';

export type PrintAthlete = {
    id: number | string;
    name: string;
    club?: string;
    seed?: number;
};

export type PrintInput = {
    tournamentName: string;
    category?: string;
    athletes: PrintAthlete[];
    options?: {
        pageSize?: PrintPageSize;
        orientation?: PrintOrientation;
        density?: PrintDensity;
        showMatchIds?: boolean;
        showClub?: boolean;
        // Internal override for deterministic high-volume pagination.
        maxRoundsPerPage?: number;
        // Internal override for page banding in large brackets.
        bandMatchCap?: number;
        // Internal large-bracket mode. Keeps <=64 behavior untouched.
        groupLocalScale?: boolean;
    };
};

export type RoundMatch = {
    id?: string;
    round: number; // 0-based
    index: number; // 0-based in round
    p1: string;
    p2: string;
    c1?: string;
    c2?: string;
    winner?: 0 | 1;
};

export type LayoutCard = {
    key: string;
    round: number;
    index: number;
    x: number;
    y: number;
    w: number;
    h: number;
    matchId?: string;
    p1: string;
    p2: string;
    c1?: string;
    c2?: string;
    winner?: 0 | 1;
};

export type LayoutLine = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export type LayoutPage = {
    index: number;
    pageNo: number;
    pageCount: number;
    pageW: number;
    pageH: number;
    safeX: number;
    safeY: number;
    safeW: number;
    safeH: number;
    title: string;
    subtitle?: string;
    groupLabel: string;
    cards: LayoutCard[];
    lines: LayoutLine[];
};

export type LayoutResult = {
    pageW: number;
    pageH: number;
    margin: number;
    safeW: number;
    safeH: number;
    rounds: number;
    firstRoundMatches: number;
    roundGroups: number[][];
    pages: LayoutPage[];
    cardW: number;
    cardH: number;
    colGap: number;
    slotPitch: number;
};

const MARGIN_MM = 10;
const TITLE_MM = 8;
const FOOTER_MM = 5;

function pageDims(pageSize: PrintPageSize, orientation: PrintOrientation): { w: number; h: number } {
    const raw = pageSize === 'A3' ? { w: 297, h: 420 } : { w: 210, h: 297 };
    return orientation === 'portrait' ? raw : { w: raw.h, h: raw.w };
}

function densityMetrics(density: PrintDensity): { cardW: number; cardH: number; colGap: number; slotPitch: number; font: number } {
    if (density === 'dense') return { cardW: 45, cardH: 12, colGap: 6, slotPitch: 14, font: 2.7 };
    if (density === 'compact') return { cardW: 48, cardH: 13, colGap: 7, slotPitch: 15, font: 2.9 };
    return { cardW: 52, cardH: 14, colGap: 8, slotPitch: 16, font: 3.1 };
}

function nextPow2(n: number): number {
    let p = 1;
    while (p < Math.max(2, n)) p <<= 1;
    return p;
}

function seededFirstRound(athletes: PrintAthlete[]): { size: number; matches: RoundMatch[] } {
    const size = nextPow2(athletes.length || 2);
    const bySeed = [...athletes].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));
    const seeded: (PrintAthlete | null)[] = Array.from({ length: size }, () => null);
    bySeed.forEach((a, i) => {
        const idx = (a.seed && a.seed > 0 && a.seed <= size) ? a.seed - 1 : i;
        if (!seeded[idx]) seeded[idx] = a;
    });
    const leftovers = bySeed.filter(a => !seeded.includes(a));
    for (let i = 0; i < size; i++) {
        if (!seeded[i]) seeded[i] = leftovers.shift() || null;
    }
    const matches: RoundMatch[] = [];
    for (let i = 0; i < size / 2; i++) {
        const leftSeed = i + 1;
        const rightSeed = size - i;
        const a = seeded[leftSeed - 1];
        const b = seeded[rightSeed - 1];
        matches.push({
            round: 0,
            index: i,
            id: `R1-${i + 1}`,
            p1: a?.name || 'BYE',
            p2: b?.name || 'BYE',
            c1: a?.club || '',
            c2: b?.club || '',
            winner: a && !b ? 0 : b && !a ? 1 : undefined,
        });
    }
    return { size, matches };
}

function roundLabel(roundStart: number, roundEnd: number, total: number): string {
    const map = (r0: number) => {
        const fromEnd = total - 1 - r0;
        if (fromEnd === 0) return 'Final';
        if (fromEnd === 1) return 'Yarı Final';
        if (fromEnd === 2) return 'Çeyrek Final';
        return `R${r0 + 1}`;
    };
    return roundStart === roundEnd ? map(roundStart) : `${map(roundStart)} - ${map(roundEnd)}`;
}

function truncateMM(s: string, maxChars: number): string {
    const t = (s || '').trim();
    if (!t) return '—';
    return t.length > maxChars ? `${t.slice(0, Math.max(1, maxChars - 1))}…` : t;
}

export function buildLayoutFromRounds(args: {
    title: string;
    subtitle?: string;
    rounds: RoundMatch[][];
    options?: PrintInput['options'];
}): LayoutResult {
    const pageSize = args.options?.pageSize || 'A4';
    const orientation = args.options?.orientation || 'portrait';
    const density = args.options?.density || 'compact';
    const showMatchIds = args.options?.showMatchIds ?? true;
    const showClub = args.options?.showClub ?? true;

    const { w: pageW, h: pageH } = pageDims(pageSize, orientation);
    const safeW = pageW - MARGIN_MM * 2;
    const safeH = pageH - MARGIN_MM * 2;
    const contentY = MARGIN_MM + TITLE_MM;
    const contentH = safeH - TITLE_MM - FOOTER_MM;

    const rounds = args.rounds;
    const totalRounds = rounds.length;
    const firstRoundMatches = rounds[0]?.length || 1;
    const m = densityMetrics(density);
    const useGroupLocalScale = args.options?.groupLocalScale === true;

    const bandSlotsBase = Math.max(1, Math.floor(contentH / m.slotPitch));
    const bandSlots = Math.max(1, Math.min(bandSlotsBase, args.options?.bandMatchCap || bandSlotsBase));
    const autoCols = Math.max(1, Math.floor((safeW + m.colGap) / (m.cardW + m.colGap)));
    const maxRoundsPerPage = Math.max(1, Math.floor(args.options?.maxRoundsPerPage || autoCols));
    const colsPerPage = Math.max(1, Math.min(autoCols, maxRoundsPerPage));
    const roundGroups: number[][] = [];
    for (let i = 0; i < totalRounds; i += colsPerPage) roundGroups.push(Array.from({ length: Math.min(colsPerPage, totalRounds - i) }, (_, d) => i + d));

    const pages: LayoutPage[] = [];

    for (let g = 0; g < roundGroups.length; g++) {
        const group = roundGroups[g];
        const groupStart = group[0];
        const groupEnd = group[group.length - 1];
        const groupText = roundLabel(groupStart, groupEnd, totalRounds);
        const firstMatchesThisGroup = useGroupLocalScale
            ? Math.max(1, rounds[groupStart]?.length || 1)
            : firstRoundMatches;
        const totalBandsThisGroup = Math.max(1, Math.ceil(firstMatchesThisGroup / bandSlots));

        for (let b = 0; b < totalBandsThisGroup; b++) {
            const slotStart = b * bandSlots;
            const cards: LayoutCard[] = [];
            const indexMap = new Map<string, LayoutCard>();

            group.forEach((r0, gi) => {
                const x = MARGIN_MM + gi * (m.cardW + m.colGap);
                const groupMatches = rounds[r0] || [];
                const roundScale = useGroupLocalScale
                    ? 1 << (r0 - groupStart)
                    : 1 << r0;
                const maxCharsName = Math.max(8, Math.floor((m.cardW - 9) * 1.65));
                const maxCharsClub = Math.max(6, Math.floor((m.cardW - 9) * 1.7));

                groupMatches.forEach((match, idx) => {
                    const centerSlot = (idx + 0.5) * roundScale;
                    const y = contentY + (centerSlot - slotStart) * m.slotPitch - m.cardH / 2;
                    if (y + m.cardH < contentY || y > contentY + contentH) return;

                    const key = `${r0}-${idx}`;
                    const card: LayoutCard = {
                        key,
                        round: r0,
                        index: idx,
                        x,
                        y,
                        w: m.cardW,
                        h: m.cardH,
                        matchId: showMatchIds ? (match.id || `R${r0 + 1}-${idx + 1}`) : undefined,
                        p1: truncateMM(match.p1, maxCharsName),
                        p2: truncateMM(match.p2, maxCharsName),
                        c1: showClub ? truncateMM(match.c1 || '', maxCharsClub) : undefined,
                        c2: showClub ? truncateMM(match.c2 || '', maxCharsClub) : undefined,
                        winner: match.winner,
                    };
                    cards.push(card);
                    indexMap.set(key, card);
                });
            });

            const lines: LayoutLine[] = [];
            group.forEach((r0) => {
                if (!group.includes(r0 + 1)) return;
                const roundMatches = rounds[r0] || [];
                roundMatches.forEach((_, idx) => {
                    const childKey = `${r0}-${idx}`;
                    const parentKey = `${r0 + 1}-${Math.floor(idx / 2)}`;
                    const c = indexMap.get(childKey);
                    const p = indexMap.get(parentKey);
                    if (!c || !p) return;
                    lines.push({
                        x1: c.x + c.w,
                        y1: c.y + c.h / 2,
                        x2: p.x,
                        y2: p.y + p.h / 2,
                    });
                });
            });

            pages.push({
                index: pages.length,
                pageNo: pages.length + 1,
                pageCount: 0,
                pageW,
                pageH,
                safeX: MARGIN_MM,
                safeY: MARGIN_MM,
                safeW,
                safeH,
                title: args.title,
                subtitle: args.subtitle,
                groupLabel: `${groupText} · Dilim ${b + 1}/${totalBandsThisGroup}`,
                cards,
                lines,
            });
        }
    }

    pages.forEach((p) => { p.pageCount = pages.length; });

    return {
        pageW,
        pageH,
        margin: MARGIN_MM,
        safeW,
        safeH,
        rounds: totalRounds,
        firstRoundMatches,
        roundGroups,
        pages,
        cardW: m.cardW,
        cardH: m.cardH,
        colGap: m.colGap,
        slotPitch: m.slotPitch,
    };
}

export function buildLayoutFromInput(input: PrintInput): LayoutResult {
    const { size, matches } = seededFirstRound(input.athletes);
    const k = Math.log2(size);
    const rounds: RoundMatch[][] = [matches];
    for (let r = 1; r < k; r++) {
        const cnt = size >> (r + 1);
        rounds.push(Array.from({ length: cnt }, (_, i) => ({
            round: r,
            index: i,
            id: `R${r + 1}-${i + 1}`,
            p1: '—',
            p2: '—',
        })));
    }
    return buildLayoutFromRounds({
        title: input.tournamentName,
        subtitle: input.category,
        rounds,
        options: input.options,
    });
}
