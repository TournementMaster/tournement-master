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
    winner: number | null;
    athlete1?: number | null;
    athlete2?: number | null;
};

type AthleteLite = { id: number; name: string; club?: string };
type ResolvedKind = 'unknown' | 'sub' | 'tournament';
type LiveBundle = {
    scope: 'sub' | 'tournament';
    day?: string;
    subs: Record<string, SubTournament>;
    matches: Record<string, Match[]>;
    athletes: Record<string, Record<number, AthleteLite>>;
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
                const { data } = await api.get<LiveBundle>(`live/${slug}/`, {
                    params: { day },
                });
                if (stop) return;
                setResolved(data.scope);
                setSubs(data.subs || {});
                setMatches(data.matches || {});
                setAthletesBySub(data.athletes || {});
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
            playable: boolean; // iki sporcu var mı?
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

        // 0) bugün olmayan sub’ları güvence için ele (backend zaten filtreli, bu sadece koruma)
        const today = day || isoToday();
        const todaysSubs = new Set(
            Object.values(subs)
                .filter((s) => (s.day || today) === today)
                .map((s) => s.public_slug),
        );

        // 1) Tüm pending maçları court’a göre grupla (sadece bugünün subs’ları)
        const buckets = new Map<number, Candidate[]>();

        for (const subSlug of Object.keys(matches)) {
            if (!todaysSubs.has(subSlug)) continue;
            const sub = subs[subSlug];
            const list = matches[subSlug] || [];
            if (!sub || !list.length) continue;

            const maxR = Math.max(...list.map((m) => m.round_no));
            // pending (winner==null) zaten backend’de; yine de güvence:
            const pending = list.filter((m) => (m.court_no ?? 0) > 0 && m.winner == null);

            for (const m of pending) {
                const c = m.court_no as number;
                const playable = !!(m.athlete1 && m.athlete2);
                if (!buckets.has(c)) buckets.set(c, []);
                buckets.get(c)!.push({ subSlug, sub, m, maxR, playable });
            }
        }

        // 2) Her court için EN KÜÇÜK match_no’lu PLAYABLE maç ana maç;
        //    sonra gelen ilk PLAYABLE maç "bir sonraki"
        const entries: Card[] = [];
        [...buckets.entries()].forEach(([courtNo, arr]) => {
            arr.sort((a, b) => {
                const aN = a.m.match_no ?? Number.POSITIVE_INFINITY;
                const bN = b.m.match_no ?? Number.POSITIVE_INFINITY;
                if (aN !== bN) return aN - bN;                        // ✨ en küçük match_no öne
                if (a.m.round_no !== b.m.round_no) return a.m.round_no - b.m.round_no;
                return a.m.position - b.m.position;
            });

            const playables = arr.filter((x) => x.playable);
            const cur = playables[0];
            if (!cur) return; // playable yoksa bu court’ta kart göstermeyelim

            const next = playables.find((x) => {
                const curNo = cur.m.match_no ?? Number.POSITIVE_INFINITY;
                const nextNo = x.m.match_no ?? Number.POSITIVE_INFINITY;
                return nextNo > curNo;
            });

            entries.push({
                id: `${cur.subSlug}-${courtNo}-${cur.m.match_no ?? cur.m.position}-${cur.m.round_no}`,
                court: courtNo,
                matchNo: cur.m.match_no,
                roundText: roundLabel(cur.m.round_no, cur.maxR),
                gender: gLabel(cur.sub.gender),
                isRunning: !!cur.sub.started,
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
    }, [matches, subs, day]);

    return (
        <div
            className="min-h-[calc(100vh-64px)] w-full text-white
      bg-[#161a20] bg-[radial-gradient(1200px_600px_at_0%_0%,rgba(120,119,198,.08),transparent_50%),radial-gradient(1000px_500px_at_100%_10%,rgba(16,185,129,.07),transparent_55%)]"
        >
            <header className="px-5 md:px-8 py-4 border-b border-white/10 bg-[#1d2129]/95 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <h1
                            className="text-[1.15rem] md:text-xl font-semibold tracking-wide
              bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent"
                        >
                            Canlı Maç Odası
                        </h1>
                        <span
                            className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.28)] live-dot"
                            aria-label="live"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-white/70 text-sm">Gün: {day}</span>
                        {refreshingRef.current && (
                            <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-5 md:px-8 py-6">
                {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">{error}</div>
                )}

                {!error && cards.length === 0 && (
                    <div className="text-white/75">Bugün için gösterilecek maç bulunamadı.</div>
                )}

                {!error && cards.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        <section className="relative overflow-hidden rounded-2xl bg-[#232834]/85 backdrop-blur border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.24)]">
            {/* Dikey accent bar */}
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-indigo-400 via-sky-300 to-emerald-300 opacity-60" />

            {/* Üst şerit */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#262b38] to-[#2a3040] border-b border-white/10">
                <div className="flex items-center gap-3 text-sm md:text-base text-white/90">
                    <div className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-white/5 ring-1 ring-white/10">
                        <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
                            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M3 12h18M12 5v14" stroke="currentColor" strokeWidth="1.7" />
                        </svg>
                        <span className="font-semibold tracking-wide">Court</span>
                        <span className="px-3.5 py-1.5 rounded-md bg-gradient-to-b from-zinc-200/90 to-zinc-50/90 text-gray-900 text-lg font-bold tabular-nums shadow">
              {court}
            </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {title ? (
                        <span className="hidden md:inline-flex items-center px-3.5 py-2 rounded-full text-xs md:text-sm bg-indigo-400/15 text-indigo-100 ring-1 ring-indigo-300/30">
              {title}
            </span>
                    ) : null}
                    <div className="text-xl md:text-2xl font-extrabold tabular-nums text-emerald-300/90">
                        {matchNo != null ? matchNo : '—'}
                    </div>
                </div>
            </div>

            {/* Gövde */}
            <div className="p-5 space-y-3.5">
                <Row label="Kategori" value={gender} big />
                <Row label="Maç No" value={matchNo != null ? `#${matchNo}` : '—'} big />
                <Row label="Tur" value={roundText} big />

                {/* Oyuncular (ana maç) */}
                {showMainPlayers && (
                    <div className="mt-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 md:gap-5">
                            <PlayerBox name={A1?.name} club={A1?.club} className="sm:basis-[44%] flex-1 min-w-0" />
                            <div className="flex-0 sm:flex-1 flex items-center justify-center">
                <span className="px-3 py-1.5 md:px-4 md:py-1.5 rounded-md font-extrabold tracking-widest text-white/90 text-lg md:text-xl bg-white/10 ring-1 ring-white/20 select-none">
                  VS
                </span>
                            </div>
                            <PlayerBox name={A2?.name} club={A2?.club} className="sm:basis-[44%] flex-1 min-w-0" />
                        </div>
                    </div>
                )}

                {/* Bir sonraki maç (yalnızca iki sporcu varsa) */}
                {showNextPlayers && (
                    <div className="mt-10">
                        <div className="text-[13px] font-extrabold uppercase tracking-wide text-amber-300 drop-shadow-[0_1px_0_rgba(0,0,0,.35)] mb-2">
                            Bir sonraki maç
                        </div>
                        <div className="flex items-center gap-3">
                            <MiniPlayerBox name={N1?.name} club={N1?.club} />
                            <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-white/10 ring-1 ring-white/20 select-none">
                vs
              </span>
                            <MiniPlayerBox name={N2?.name} club={N2?.club} />
                        </div>
                    </div>
                )}

                <div className="pt-1">
          <span
              className={[
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold select-none ring-1',
                  isRunning
                      ? 'bg-emerald-500/22 text-emerald-100 ring-emerald-400/45 shadow-[0_0_0_3px_rgba(16,185,129,.12)_inset]'
                      : 'bg-amber-400/25 text-amber-100 ring-amber-300/45 shadow-[0_0_0_3px_rgba(251,191,36,.12)_inset]',
              ].join(' ')}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-90" aria-hidden />
              {isRunning ? 'OYNANIYOR' : 'BEKLEMEDE'}
          </span>
                </div>
            </div>
        </section>
    );
}

/** Oyuncu kartı — ana maç */
function PlayerBox({ name, club, className = '' }: { name?: string; club?: string; className?: string }) {
    const cleanedName =
        String(name || '')
            .replace(/\bexample\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || '—';

    return (
        <div className={`min-w-0 ${className}`}>
            <div className="w-full bg-[#3a404b] ring-1 ring-white/10 rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-center shadow-sm">
                <div className="font-extrabold uppercase tracking-wide text-white truncate text-[0.95rem] sm:text-[1.05rem] lg:text-[1.1rem] leading-tight">
                    {cleanedName}
                </div>
                {club ? (
                    <div className="mt-1 uppercase font-semibold truncate text-[11px] sm:text-xs text-sky-300/90">{club}</div>
                ) : (
                    <div className="mt-1 h-4" />
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
            <div
                className="w-full rounded-xl px-3.5 py-2.5 text-center
                      bg-[#4b5261] text-white ring-1 ring-white/15
                      shadow-[0_3px_10px_rgba(0,0,0,.18)]"
            >
                <div className="font-black uppercase tracking-wide truncate text-[0.95rem] md:text-[1rem] leading-tight">
                    {cleanedName}
                </div>
                {club ? (
                    <div
                        className="mt-0.5 text-[11px] md:text-[12px] font-extrabold uppercase tracking-wide truncate
                          text-sky-300 drop-shadow-[0_1px_0_rgba(0,0,0,.55)]"
                    >
                        {club}
                    </div>
                ) : (
                    <div className="mt-0.5 h-3" />
                )}
            </div>
        </div>
    );
}

function Row({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 text-white/70 ${big ? 'text-[0.95rem]' : 'text-[0.9rem]'} font-medium`}>{label}</span>
            <span className={`grow text-right text-white/95 ${big ? 'text-[0.95rem]' : 'text-[0.95rem]'} font-semibold truncate`}>
        {value}
      </span>
        </div>
    );
}
