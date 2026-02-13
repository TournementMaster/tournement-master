import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

/** ---- Backend tipleri (minimal) ---- */
type SubTournament = {
    public_slug: string;
    title: string;
    gender: 'M' | 'F';
    started: boolean;
    court_no: number;
    day?: string | null;   // ✨ eklendi
};

type Match = {
    id: number;
    round_no: number;
    position: number;
    court_no: number | null;
    match_no: number | null;
    moved_match_no?: string | number | null;
    winner: number | null;
    athlete1?: number | null;
    athlete2?: number | null;
};

type AthleteLite = { id: number; name: string; club?: string };
type ResolvedKind = 'unknown' | 'sub' | 'tournament';
// LiveBundle tipini genişlet
type LiveBundle = {
    scope: 'sub' | 'tournament';
    day?: string;
    subs: Record<string, SubTournament>;
    matches: Record<string, Match[]>;
    athletes: Record<string, Record<number, AthleteLite>>;
    last_finished_by_court?: Record<number, string | number | null>; // ✨ moved destekli (opsiyonel)
};


const gLabel = (g?: string) => (g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : '—');
const roundLabel = (r: number, maxR: number) => {
    const idx = Math.max(0, maxR - r);
    if (idx === 0) return 'Final';
    if (idx === 1) return 'Yarı Final';
    if (idx === 2) return 'Çeyrek Final';
    return `${r}. Tur`;
};

const isoToday = () => {
    const d = new Date();
    // local gün: YYYY-MM-DD
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function LiveMatchPage() {
    const { slug } = useParams<{ slug: string }>();
    const [resolved, setResolved] = useState<ResolvedKind>('unknown');

    const [subs, setSubs] = useState<Record<string, SubTournament>>({});
    const [matches, setMatches] = useState<Record<string, Match[]>>({});
    const [day, setDay] = useState<string>(isoToday());
    const [error, setError] = useState<string | null>(null);
    const refreshingRef = useRef(false);
    const [athletesBySub, setAthletesBySub] =
        useState<Record<string, Record<number, AthleteLite>>>({});

    // Tek seferde hepsini alan akış (+ polling)
    useEffect(() => {
        if (!slug) return;
        let stop = false;
        let timer: any;
        setError(null);

        const fetchBundle = async (isPoll = false) => {
            try {
                refreshingRef.current = true;
                const params = isPoll ? { day, lite: 1 } : { day };
                const { data } = await api.get<LiveBundle>(`live/${slug}/`, { params });
                if (stop) return;
                setResolved(data.scope);
                if (!isPoll) setSubs(data.subs || {});
                setMatches(data.matches || {});
                if (!isPoll) setAthletesBySub(data.athletes || {});
                if (data.day) setDay(data.day);
            } catch {
                if (!stop && !isPoll) setError('Veri yüklenemedi.');
            } finally {
                refreshingRef.current = false;
                if (!stop && isPoll) {
                    timer = setTimeout(() => fetchBundle(true), 15000);
                }
            }
        };

        // ilk yükleme + periyodik polling
        fetchBundle(false).then(() => {
            if (!stop) timer = setTimeout(() => fetchBundle(true), 15000);
        });

        return () => {
            stop = true;
            clearTimeout(timer);
        };
    }, [slug, day]);

    /** Kart verileri — BUGÜN ve COURT bazında tek kart + sıradaki maç */
    const cards = useMemo(() => {
        type Candidate = {
            subSlug: string;
            sub: SubTournament;
            m: Match;
            maxR: number;
        };

        type Card = {
            id: string;
            court: number;
            matchNo: number | null;
            roundText: string;
            gender: string;
            isRunning: boolean;
            title?: string;
            // şu anki maç
            subSlug: string;
            athlete1: number | null;
            athlete2: number | null;
            // bir sonraki maç (opsiyonel)
            nextSubSlug?: string;
            nextAthlete1?: number | null;
            nextAthlete2?: number | null;
        };

        const today = day || isoToday();
        const todaysSubs = new Set(
            Object.values(subs)
                .filter((s) => (s.day || today) === today)
                .map((s) => s.public_slug)
        );

        // 1) Bugün oynanan alt turnuvalardaki maçları kort bazında grupla
        const byCourt = new Map<number, Candidate[]>();

        for (const subSlug of Object.keys(matches)) {
            if (!todaysSubs.has(subSlug)) continue;
            const sub = subs[subSlug];
            const list = matches[subSlug] || [];
            if (!sub || !list.length) continue;

            const maxR = Math.max(...list.map((m) => m.round_no));
            for (const m of list) {
                const c = m.court_no ?? 0;
                if (c <= 0) continue;

                const cand: Candidate = { subSlug, sub, m, maxR };
                if (!byCourt.has(c)) byCourt.set(c, []);
                byCourt.get(c)!.push(cand);
            }
        }

        // 2) Her kort için en küçük maç numaralı maçı seç
        const entries: Card[] = [];
        [...byCourt.keys()].forEach((courtNo) => {
            const all = byCourt.get(courtNo) || [];
            if (!all.length) return;

            // moved_match_no varsa onu, yoksa match_no kullan (decimal destekli)
            const effNo = (c: Candidate) => {
                const raw = (c.m.moved_match_no ?? c.m.match_no) as any;
                const n = raw == null ? NaN : Number(String(raw).replace(',', '.'));
                return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
            };

            const sorted = [...all].sort((a, b) => {
                const aN = effNo(a);
                const bN = effNo(b);
                if (aN !== bN) return aN - bN;
                if (a.m.round_no !== b.m.round_no) return a.m.round_no - b.m.round_no;
                return a.m.position - b.m.position;
            });

            const cur = sorted[0];
            if (!cur) return;

            // "Bir sonraki maç": aynı korttaki ikinci en küçük maç no
            const next = sorted.find((x) => x !== cur);

            entries.push({
                id: `${cur.subSlug}-${courtNo}-${cur.m.match_no ?? cur.m.position}-${cur.m.round_no}`,
                court: courtNo,
                matchNo: Number.isFinite(effNo(cur)) ? effNo(cur) : null,
                roundText: roundLabel(cur.m.round_no, cur.maxR),
                gender: gLabel(cur.sub.gender),
                isRunning: cur.m.winner == null,
                title: cur.sub.title,
                subSlug: cur.subSlug,
                athlete1: cur.m.athlete1 ?? null,
                athlete2: cur.m.athlete2 ?? null,
                nextSubSlug: next?.subSlug,
                nextAthlete1: next?.m.athlete1 ?? null,
                nextAthlete2: next?.m.athlete2 ?? null,
            });
        });

        entries.sort((a, b) => a.court - b.court);
        return entries;
    }, [matches, subs, day, resolved]);


    return (
        <div className="min-h-[calc(100vh-64px)] w-full text-white bg-transparent">
            <header className="px-5 md:px-8 py-6 mb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="absolute -inset-1 rounded-full bg-red-500/50 blur-sm animate-pulse" />
                            <span className="relative block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                        </div>
                        <h1
                            className="text-2xl md:text-3xl font-display font-bold tracking-tight
              bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent drop-shadow-sm"
                        >
                            Canlı Maç Odası
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium backdrop-blur-sm">
                            {day}
                        </span>
                        {refreshingRef.current && (
                            <svg className="animate-spin h-5 w-5 text-premium-accent" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-5 md:px-8 pb-10">
                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 px-6 py-4 shadow-lg backdrop-blur-md">{error}</div>
                )}

                {!error && cards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-gray-400">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-xl font-light text-gray-300">Şu anda oynanan maç bulunamadı.</p>
                        <p className="text-sm text-gray-500 mt-2">Daha sonra tekrar kontrol edin.</p>
                    </div>
                )}

                {!error && cards.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {cards.map((c) => (
                            <CourtCard
                                key={c.id}
                                court={c.court}
                                matchNo={c.matchNo}
                                roundText={c.roundText}
                                gender={c.gender}
                                isRunning={c.isRunning}
                                title={c.title}
                                allAthletes={athletesBySub}
                                curSubSlug={c.subSlug}
                                athlete1={c.athlete1}
                                athlete2={c.athlete2}
                                nextSubSlug={c.nextSubSlug}
                                nextAthlete1={c.nextAthlete1}
                                nextAthlete2={c.nextAthlete2}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

/* -------------------------- Sunum Bileşeni -------------------------- */
function CourtCard({
    court,
    matchNo,
    roundText,
    gender,
    isRunning,
    title,
    allAthletes,
    curSubSlug,
    athlete1,
    athlete2,
    nextSubSlug,
    nextAthlete1,
    nextAthlete2,
}: {
    court: number;
    matchNo: number | null;
    roundText: string;
    gender: string;
    isRunning: boolean;
    title?: string;
    allAthletes: Record<string, Record<number, AthleteLite>>;
    curSubSlug: string;
    athlete1: number | null;
    athlete2: number | null;
    nextSubSlug?: string;
    nextAthlete1?: number | null;
    nextAthlete2?: number | null;
}) {
    const A = allAthletes[curSubSlug] || {};
    const NA = nextSubSlug ? allAthletes[nextSubSlug] || {} : {};

    const A1 = athlete1 != null ? A[athlete1] : undefined;
    const A2 = athlete2 != null ? A[athlete2] : undefined;

    const N1 = nextAthlete1 != null ? NA[nextAthlete1!] : undefined;
    const N2 = nextAthlete2 != null ? NA[nextAthlete2!] : undefined;

    const showMainPlayers = !!(A1 && A2);
    const showNextPlayers = !!(N1 && N2);

    return (
        <section className="group relative overflow-hidden rounded-3xl border border-white/5 bg-premium-card/40 backdrop-blur-xl shadow-glass hover:shadow-elite hover:bg-premium-card/60 transition-all duration-500">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-premium-accent/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-premium-accent/20 transition-colors" />

            {/* Üst şerit - Court Info */}
            <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                        {court}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Kort No</span>
                        {title && <span className="text-xs text-indigo-200 truncate max-w-[150px]">{title}</span>}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Maç No</div>
                    <div className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-emerald-500 drop-shadow-sm tabular-nums">
                        {matchNo != null ? `#${matchNo}` : '—'}
                    </div>
                </div>
            </div>

            {/* Gövde */}
            <div className="relative p-6 space-y-5">
                {/* Meta Rows */}
                <div className="flex items-center justify-between text-sm">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium text-xs">
                        {gender}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-200 font-medium text-xs">
                        {roundText}
                    </span>
                </div>

                {/* Oyuncular (ana maç) */}
                {showMainPlayers ? (
                    <div className="relative mt-2 p-4 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
                        <div className="flex flex-col gap-4">
                            <PlayerBox name={A1?.name} club={A1?.club} side="blue" />

                            <div className="relative flex items-center justify-center py-1">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 py-0.5 bg-[#121212] border border-white/10 rounded text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                        VS
                                    </span>
                                </div>
                            </div>

                            <PlayerBox name={A2?.name} club={A2?.club} side="red" />
                        </div>
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center rounded-2xl bg-black/20 border border-dotted border-white/10 text-gray-600 text-sm">
                        Oyuncular bekleniyor...
                    </div>
                )}

                {/* Status Indicator */}
                <div className="pt-2 flex justify-center">
                    <span
                        className={[
                            'relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border backdrop-blur-md shadow-lg transition-all',
                            isRunning
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-500/10'
                        ].join(' ')}
                    >
                        {isRunning && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        )}
                        <span className={isRunning ? 'pl-3' : ''}>
                            {isRunning ? 'Şu An Oynanıyor' : 'Sıradaki Maç Bekleniyor'}
                        </span>
                    </span>
                </div>

                {/* Bir sonraki maç (Footer) */}
                {showNextPlayers && (
                    <div className="mt-6 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">Sıradaki Maç</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity">
                            <MiniPlayerBox name={N1?.name} club={N1?.club} />
                            <span className="text-[10px] font-bold text-gray-600">vs</span>
                            <MiniPlayerBox name={N2?.name} club={N2?.club} />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/** Oyuncu kartı — ana maç */
function PlayerBox({ name, club, side }: { name?: string; club?: string; side: 'blue' | 'red' }) {
    const cleanedName =
        String(name || '')
            .replace(/\bexample\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || '—';

    const isBlue = side === 'blue';
    const borderColor = isBlue ? 'border-sky-500/30' : 'border-rose-500/30';
    const textColor = isBlue ? 'text-sky-100' : 'text-rose-100';
    const clubColor = isBlue ? 'text-sky-400/70' : 'text-rose-400/70';

    return (
        <div className={`relative flex items-center justify-between p-3 rounded-lg bg-white/5 border ${borderColor} transition-colors hover:bg-white/10`}>
            <div className="min-w-0 flex-1">
                <div className={`font-display font-bold text-lg leading-none ${textColor} truncate`}>
                    {cleanedName}
                </div>
                {club && (
                    <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${clubColor} truncate`}>
                        {club}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Mini kutucuk — bir sonraki maç */
function MiniPlayerBox({ name, club }: { name?: string; club?: string }) {
    const cleanedName =
        String(name || '')
            .replace(/\bexample\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || '—';

    return (
        <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-300 truncate">
                {cleanedName}
            </div>
            {club && (
                <div className="text-[9px] font-bold uppercase text-gray-500 truncate">
                    {club}
                </div>
            )}
        </div>
    );
}

function Row({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            {/* Unused legacy helper, keeping just in case or remove if clean-up needed */}
        </div>
    );
}
