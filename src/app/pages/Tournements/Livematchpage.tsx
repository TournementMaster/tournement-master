// src/app/pages/LiveMatchPage.tsx
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
};
type Match = {
    id: number;
    round_no: number;
    position: number;
    court_no: number | null;
    match_no: number | null;
    winner: number | null;
    /** oyuncular (serializer’dan geliyor) */
    athlete1?: number | null;
    athlete2?: number | null;
};

type AthleteLite = { id: number; name: string; club?: string };

type ResolvedKind = 'unknown' | 'sub' | 'tournament';

const gLabel = (g?: string) => (g === 'M' ? 'Erkek' : g === 'F' ? 'Kadın' : '—');
const roundLabel = (r: number, maxR: number) => {
    const idx = Math.max(0, maxR - r);
    if (idx === 0) return 'Final';
    if (idx === 1) return 'Yarı Final';
    if (idx === 2) return 'Çeyrek Final';
    return `${r}. Tur`;
};

export default function LiveMatchPage() {
    const { slug } = useParams<{ slug: string }>();
    const [resolved, setResolved] = useState<ResolvedKind>('unknown');

    const [subs, setSubs] = useState<Record<string, SubTournament>>({});
    const [matches, setMatches] = useState<Record<string, Match[]>>({});
    const [error, setError] = useState<string | null>(null);
    const refreshingRef = useRef(false);

    // subSlug -> { athleteId -> {name, club} }
    const [athletesBySub, setAthletesBySub] =
        useState<Record<string, Record<number, AthleteLite>>>({});

    /** ---- Veri çekiciler ---- */
    const fetchSubDetail = (subSlug: string) =>
        api.get<SubTournament>(`subtournaments/${subSlug}/`).then(r => r.data);

    const fetchSubMatches = async (subSlug: string) => {
        try {
            const r = await api.get<Match[]>(`subtournaments/${subSlug}/matches/`);
            return r.data;
        } catch {
            // bazı kurulumlarda eski kısayol var
            const r2 = await api.get<Match[]>(`subtournements/${subSlug}/matches`);
            return r2.data;
        }
    };

    const fetchAsSub = async (subSlug: string) => {
        const sub = await fetchSubDetail(subSlug);
        const m = await fetchSubMatches(subSlug).catch(() => [] as Match[]);
        return { sub, matches: m };
    };

    const fetchAsTournament = async (tSlug: string) => {
        const list = await api.get<SubTournament[]>(
            `tournaments/${tSlug}/subtournaments/`
        );
        const subsArr = Array.isArray(list.data) ? list.data : [];
        const results = await Promise.all(
            subsArr.map(async (s) => {
                const m = await fetchSubMatches(s.public_slug).catch(() => [] as Match[]);
                return { sub: s, matches: m };
            })
        );
        return results;
    };

    /* ───────── 1) SLUG çözümleme: sadece 1 kez ───────── */
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        // reset
        setResolved('unknown');
        setSubs({});
        setMatches({});
        setError(null);

        (async () => {
            // 1) ÖNCE TURNUVA OLARAK DENE
            try {
                const bundles = await fetchAsTournament(slug);
                if (!cancelled && bundles.length > 0) {
                    const nextSubs: Record<string, SubTournament> = {};
                    const nextMatches: Record<string, Match[]> = {};
                    bundles.forEach(({ sub, matches }) => {
                        nextSubs[sub.public_slug] = sub;
                        nextMatches[sub.public_slug] = matches;
                    });
                    setResolved('tournament');
                    setSubs(nextSubs);
                    setMatches(nextMatches);
                    return;
                }
            } catch {
                // yoksay, sub olarak dene
            }

            // 2) SUB OLARAK DENE (fallback)
            try {
                const asSub = await fetchAsSub(slug);
                if (cancelled) return;
                setResolved('sub');
                setSubs({ [asSub.sub.public_slug]: asSub.sub });
                setMatches({ [asSub.sub.public_slug]: asSub.matches });
            } catch {
                if (!cancelled) setError('Alt turnuva veya turnuva bulunamadı.');
            }
        })();

        return () => { cancelled = true; };
    }, [slug]);

    /* ───────── 2) Polling: tek timer, overlap yok ───────── */
    useEffect(() => {
        if (!slug || resolved === 'unknown') return;
        let stop = false;
        let timer: any;

        const poll = async () => {
            if (stop) return;
            refreshingRef.current = true;
            try {
                if (resolved === 'sub') {
                    const key = Object.keys(subs)[0] || slug;
                    const [detail, m] = await Promise.all([
                        fetchSubDetail(key).catch(() => subs[key]),
                        fetchSubMatches(key).catch(() => matches[key] || []),
                    ]);
                    if (stop) return;
                    setSubs({ [detail.public_slug]: detail });
                    setMatches({ [detail.public_slug]: m });
                } else {
                    const keys = Object.keys(subs);
                    if (!keys.length) return;
                    const refreshed = await Promise.all(
                        keys.map(k => fetchSubMatches(k).catch(() => matches[k] || []))
                    );
                    if (stop) return;
                    const next: Record<string, Match[]> = {};
                    keys.forEach((k, i) => (next[k] = refreshed[i]));
                    setMatches(next);
                }
            } finally {
                refreshingRef.current = false;
                if (!stop) timer = setTimeout(poll, 15000); // 15 sn
            }
        };

        // ilk tetikleme
        timer = setTimeout(poll, 15000);

        return () => {
            stop = true;
            clearTimeout(timer);
        };
        // burada subs/matches bağımlılığı YOK -> timer yeniden kurulmaz
    }, [slug, resolved]);

    /* Sporcuları bir kez cache’le (her alt turnuva için) */
    useEffect(() => {
        const slugs = Object.keys(subs || {});
        if (!slugs.length) return;

        let cancelled = false;

        (async () => {
            await Promise.all(slugs.map(async (s) => {
                if (athletesBySub[s]) return; // daha önce çekilmiş
                try {
                    const { data } = await api.get(`subtournaments/${s}/athletes/`);
                    if (cancelled) return;
                    const map: Record<number, AthleteLite> = {};
                    (Array.isArray(data) ? data : []).forEach((a: any) => {
                        const fn = String(a.first_name || '');
                        const ln = String(a.last_name  || '');
// "example" kelimesini (büyük/küçük fark etmeksizin) ayıkla, boşlukları toparla
                        const cleaned = `${fn} ${ln}`.replace(/\bexample\b/ig, '').replace(/\s+/g, ' ').trim();

                        map[a.id] = {
                            id: a.id,
                            name: cleaned,
                            club: a.club_name || undefined,
                        };
                    });
                    setAthletesBySub((prev) => ({ ...prev, [s]: map }));
                } catch {
                    /* yoksay – anonim erişimde de çalışır */
                }
            }));
        })();

        return () => { cancelled = true; };
    }, [subs, athletesBySub, api]);

    /** Kart verileri */
    const cards = useMemo(() => {
        type Card = {
            id: string;               // benzersiz anahtar
            court: number;
            matchNo: number | null;
            roundText: string;
            gender: string;
            isRunning: boolean;
            title?: string;
            subSlug: string;
            athlete1: number | null;
            athlete2: number | null;
        };

        const entries: Card[] = [];

        Object.keys(matches).forEach((subSlug) => {
            const sub = subs[subSlug];
            const list = matches[subSlug] || [];
            if (!sub || !list.length) return;

            const maxR = Math.max(...list.map((m) => m.round_no));
            const pending = list
                .filter((m) => (m.court_no ?? 0) > 0 && m.winner == null)
                .sort((a, b) =>
                    a.court_no === b.court_no
                        ? a.round_no === b.round_no
                            ? a.position - b.position
                            : a.round_no - b.round_no
                        : (a.court_no! - b.court_no!)
                );

            const seen = new Set<number>();
            for (const m of pending) {
                const c = m.court_no!;
                if (seen.has(c)) continue;
                seen.add(c);
                entries.push({
                    id: `${subSlug}-${c}-${m.match_no ?? m.position}-${m.round_no}`,
                    court: c,
                    matchNo: m.match_no,
                    roundText: roundLabel(m.round_no, maxR),
                    gender: gLabel(sub.gender),
                    isRunning: !!sub.started,
                    title: sub.title,
                    subSlug,
                    athlete1: m.athlete1 ?? null,
                    athlete2: m.athlete2 ?? null,
                });
            }
        });

        entries.sort((a, b) => a.court - b.court);
        return entries;
    }, [matches, subs]);


    return (
        <div className="min-h[calc(100vh-64px)] w-full text-white
      bg-[#161a20] bg-[radial-gradient(1200px_600px_at_0%_0%,rgba(120,119,198,.08),transparent_50%),radial-gradient(1000px_500px_at_100%_10%,rgba(16,185,129,.07),transparent_55%)]">
            <header className="px-5 md:px-8 py-4 border-b border-white/10 bg-[#1d2129]/95 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[1.15rem] md:text-xl font-semibold tracking-wide
              bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                            Canlı Maç Odası
                        </h1>
                        <span
                            className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.28)] live-dot"
                            aria-label="live"
                        />
                    </div>
                    <div className="flex items-center gap-3">

                        {refreshingRef.current && (
                            <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                <path className="opacity-75" fill="currentColor"
                                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-5 md:px-8 py-6">
                {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
                        {error}
                    </div>
                )}

                {!error && cards.length === 0 && (
                    <div className="text-white/75">Gösterilecek maç bulunamadı.</div>
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
                                athletesMap={athletesBySub[c.subSlug] || {}}
                                athlete1={c.athlete1}
                                athlete2={c.athlete2}
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
                       athletesMap,
                       athlete1,
                       athlete2,
                   }: {
    court: number;
    matchNo: number | null;
    roundText: string;
    gender: string;
    isRunning: boolean;
    title?: string;
    athletesMap?: Record<number, AthleteLite>;
    athlete1: number | null;
    athlete2: number | null;
}) {
    const A1 = athlete1 != null ? athletesMap?.[athlete1] : undefined;
    const A2 = athlete2 != null ? athletesMap?.[athlete2] : undefined;

    return (
        <section className="relative overflow-hidden rounded-2xl
      bg-[#232834]/85 backdrop-blur
      border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.24)]">
            {/* Dikey accent bar */}
            <div className="absolute left-0 top-0 h-full w-1.5
        bg-gradient-to-b from-indigo-400 via-sky-300 to-emerald-300 opacity-60" />

            {/* Üst şerit */}
            <div className="flex items-center justify-between px-5 py-4
        bg-gradient-to-r from-[#262b38] to-[#2a3040] border-b border-white/10">
                <div className="flex items-center gap-3 text-base text-white/90">
                    <div className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg
              bg-white/5 ring-1 ring-white/10">
                        <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
                            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                            <path d="M3 12h18M12 5v14" stroke="currentColor" strokeWidth="1.7"/>
                        </svg>
                        <span className="font-semibold tracking-wide">Court</span>
                        <span className="px-4.5 py-2 rounded-md bg-gradient-to-b from-zinc-200/90 to-zinc-50/90 text-gray-900 text-lg md:text-xl font-bold tabular-nums shadow">
              {court}
            </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {title ? (
                        <span className="hidden md:inline-flex items-center px-4 py-2.5 rounded-full text-sm
              bg-indigo-400/15 text-indigo-100 ring-1 ring-indigo-300/30">
              {title}
            </span>
                    ) : null}
                    <div className="text-2xl font-extrabold tabular-nums text-emerald-300/90">
                        {matchNo != null ? matchNo : '—'}
                    </div>
                </div>
            </div>

            {/* Gövde */}
            <div className="p-5 space-y-4">
                <Row label="Kategori" value={gender} big />
                <Row label="Maç No" value={matchNo != null ? `#${matchNo}` : '—'} big />
                <Row label="Tur" value={roundText} big />

                {/* O anki maçın sporcuları – modern kutular + adaptif çizgi */}
                {(A1 || A2) && (
                    <div className="mt-4">
                        <div className="flex items-center gap-4 md:gap-6 xl:gap-8">
                            <PlayerBox name={A1?.name} club={A1?.club} className="basis-[42%]" />
                            <div className="flex-1 flex items-center justify-center">
    <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-md font-extrabold tracking-widest
                     text-white/90 text-lg md:text-2xl bg-white/10 ring-1 ring-white/20 select-none">
      VS
    </span>
                            </div>
                            <PlayerBox name={A2?.name} club={A2?.club} className="basis-[42%]" />
                        </div>

                    </div>
                )}

                <div className="pt-1">
          <span
              className={[
                  'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold select-none ring-1',
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

/** Oyuncu kartı (UPPERCASE isim + açık mavi kulüp) */
function PlayerBox({ name, club, className = '' }: { name?: string; club?: string; className?: string }) {
    const cleanedName = String(name || '')
        .replace(/\bexample\b/ig, '')     // "example" kelimesini sil
        .replace(/\s+/g, ' ')
        .trim() || '—';

    return (
        <div className={`min-w-[180px] ${className}`}>
            <div className="bg-[#3a404b] ring-1 ring-white/10 rounded-xl px-4 py-2.5 md:px-4 md:py-3 text-center shadow-sm">
                <div className="font-extrabold uppercase tracking-wide text-white truncate
                        text-[0.95rem] sm:text-[1.05rem] lg:text-[1.15rem] leading-tight">
                    {cleanedName}
                </div>
                {club ? (
                    <div className="mt-1 uppercase font-semibold truncate
                          text-[11px] sm:text-xs md:text-sm text-sky-300/90">
                        {club}
                    </div>
                ) : (
                    <div className="mt-1 h-4 sm:h-4 md:h-5" />
                )}
            </div>
        </div>
    );
}


function Row({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className={`text-white/70 ${big ? 'text-base' : 'text-[0.9rem]'} font-medium`}>{label}</span>
            <span className={`text-white/95 ${big ? 'text-base' : 'text-[0.95rem]'} font-semibold`}>{value}</span>
        </div>
    );
}
