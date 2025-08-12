import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    TransformWrapper,
    TransformComponent,
    type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import MatchModal from './MatchModal';
import { useBracketTheme, type BracketThemeKey } from '../../../context/BracketThemeContext';
import { PALETTES, type ThemeKey, type Palette } from '../../../context/themePalettes';
import { usePlayers, type Participant } from '../../../hooks/usePlayers';
import { useSettings } from '../../../context/BracketSettingsCtx';
import { useLocation } from 'react-router-dom';
import { api } from '../../../lib/api';
import type { Club } from '../../../models/Club';
import type { SubTournament } from '../../../hooks/useSubTournaments';

/* --------------------------------- Types --------------------------------- */
export interface Player { seed: number; name: string; club?: string; winner?: boolean }
export interface Meta   { scores?: [number, number][]; manual?: 0 | 1; time?: string; court?: string }
export interface Match  { players: Player[]; meta?: Meta }
type Matrix = Match[][]

type ApiAthlete = {
    id: number; first_name: string; last_name: string;
    birth_year: number; weight: string | number; gender: 'M' | 'F' | string;
    club: number | null;
};

type ApiMatchSet = { id: number; set_no: number; a1_score: number; a2_score: number; match: number };
type ApiMatch = {
    id: number; sets: ApiMatchSet[];
    round_no: number; position: number;
    court_no: number | null; scheduled_at: string | null; extra_note: string;
    sub_tournament: number; athlete1: number | null; athlete2: number | null; winner: number | null;
};
type ClubRow = { id: number; name: string; city?: string };

/* ----------------------------- Layout constants -------------------------- */
const BOX_W = 340;
const BOX_H = 78;
const GAP   = 120;
const BASE  = BOX_H;
const CORNER = 10;
type Pos = { mid:number; y1:number; y2:number };

/* -------------------------------- Helpers -------------------------------- */
function blank(): Match { return { players:[{seed:0,name:'—'},{seed:0,name:'—'}] } }

function seedOrder(size:number): number[] {
    if (size < 2) return [1];
    let prev = [1,2];
    while (prev.length < size) {
        const n = prev.length * 2;
        const comp = prev.map(x => n + 1 - x);
        const next:number[] = [];
        for (let i=0;i<prev.length;i+=2){
            const a = prev[i],   b = prev[i+1];
            const A = comp[i],   B = comp[i+1];
            next.push(a, A, B, b);
        }
        prev = next;
    }
    return prev;
}
function nextPowerOfTwo(n: number) { let s=1; while(s<n) s<<=1; return Math.max(4,s) }

/* Yerelden ilk turu kur */
function buildMatrix(participants: Participant[], placementMap: Record<number,number>|null): Matrix {
    const n = participants.length;
    const size = nextPowerOfTwo(n);
    const order = seedOrder(size);

    const slotToPlayer = new Map<number, Player>();
    for (const p of participants) {
        const slotSeed = placementMap?.[p.seed] ?? p.seed;
        slotToPlayer.set(slotSeed, { seed: p.seed, name: p.name, club: p.club });
    }

    const r0: Match[] = [];
    for (let i=0; i<order.length; i+=2){
        const a = slotToPlayer.get(order[i])   ?? { seed:0, name:'—' };
        const b = slotToPlayer.get(order[i+1]) ?? { seed:0, name:'—' };
        r0.push({ players: [a, b] });
    }

    const rounds: Matrix = [r0];
    let games = size/4;
    while (games >= 1) { rounds.push(Array(games).fill(0).map(blank)); games /= 2 }
    return rounds;
}

/* Kazananları sonraki tura taşı */
function propagate(matrix: Matrix): Matrix {
    const mat: Matrix = matrix.map(r => r.map(m => ({
        players: m.players.map(p => ({ ...p })),
        meta: m.meta ? { ...m.meta, scores: m.meta.scores ? [...m.meta.scores] as [number,number][] : undefined } : undefined,
    })));

    for (let r = 0; r < mat.length - 1; r++) {
        mat[r].forEach((m, idx) => {
            const [p1, p2] = m.players;
            let winner: 0 | 1 | undefined;

            if (r === 0) { // ilk tur bye
                const aBye = p1.seed === 0 || p1.name === '—';
                const bBye = p2.seed === 0 || p2.name === '—';
                if (aBye && !bBye) winner = 1;
                else if (bBye && !aBye) winner = 0;
            }

            if (winner == null && m.meta?.scores?.length) {
                const [a, b] = m.meta.scores[0];
                if (a !== b) winner = a > b ? 0 : 1;
                else if (m.meta.manual != null) winner = m.meta.manual;
            }

            if (winner != null) {
                m.players[winner]   = { ...m.players[winner], winner: true };
                m.players[1-winner] = { ...m.players[1-winner], winner: false };

                const next = mat[r+1][Math.floor(idx/2)];
                const moved = { ...m.players[winner] };
                delete (moved).winner;
                next.players[idx%2] = moved;
            }
        });
    }
    return mat;
}

/* Tema anahtarı çözümle */
function resolveThemeKey(k: BracketThemeKey): ThemeKey {
    switch (k) {
        case 'classic-dark':
        case 'classic-light': return 'classic';
        case 'modern-dark':
        case 'modern-light':  return 'purple';
        case 'purple-orange': return 'orange';
        case 'black-white':   return 'invert';
        case 'ocean':   return 'ocean';
        case 'forest':  return 'forest';
        case 'rose':    return 'rose';
        case 'gold':    return 'gold';
        case 'crimson': return 'crimson';
        case 'teal':    return 'teal';
        case 'slate':   return 'slate';
        default:        return 'classic';
    }
}

/* ISO → HH.MM */
function toHHMM(iso: string | null | undefined): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
}

/* ------------------------- Backend → Matrix builder ----------------------- */
function buildFromBackend(
    athletes: ApiAthlete[],
    matches: ApiMatch[],
    clubs: ClubRow[],
): { matrix: Matrix; firstRound: Participant[] } {
    const clubMap = new Map<number, string>();
    clubs.forEach(c => clubMap.set(c.id, c.name));

    const aMap = new Map<number, { name: string; club?: string }>();
    athletes.forEach(a => {
        const name = (a.first_name || '').trim() || `${a.first_name} ${a.last_name}`.trim() || '—';
        const club = a.club != null ? clubMap.get(a.club) : undefined;
        aMap.set(a.id, { name, club });
    });

    const maxRound = matches.length ? Math.max(...matches.map(m => m.round_no)) : 0;
    const matrix: Matrix = maxRound ? Array.from({ length: maxRound }, () => []) : [];

    for (let r = 1; r <= maxRound; r++) {
        const inRound = matches.filter(m => m.round_no === r);
        const maxPos = inRound.length ? Math.max(...inRound.map(m => m.position)) : 0;
        matrix[r - 1] = Array.from({ length: maxPos }, () => blank());

        inRound.forEach(m => {
            const p1 = m.athlete1 ? (aMap.get(m.athlete1) ?? { name: '—' }) : { name: '—' };
            const p2 = m.athlete2 ? (aMap.get(m.athlete2) ?? { name: '—' }) : { name: '—' };

            const players: Player[] = [
                { seed: 0, name: p1.name, club: p1.club },
                { seed: 0, name: p2.name, club: p2.club },
            ];

            const meta: Meta = {};
            if (Array.isArray(m.sets) && m.sets.length) meta.scores = m.sets.map(s => [s.a1_score, s.a2_score]);
            const t = toHHMM(m.scheduled_at);
            if (t) meta.time = t;
            if (m.court_no != null) meta.court = String(m.court_no);

            if (m.winner != null) {
                if (m.winner === m.athlete1) {
                    players[0] = { ...players[0], winner: true };
                    players[1] = { ...players[1], winner: false };
                } else if (m.winner === m.athlete2) {
                    players[1] = { ...players[1], winner: true };
                    players[0] = { ...players[0], winner: false };
                }
            }

            matrix[r - 1][m.position - 1] = { players, meta };
        });
    }

    // İlk turdan yan panel için participants listesi
    const firstRound: Participant[] = (matrix[0] ?? []).flatMap((m, idx) => {
        const out: Participant[] = [];
        if (m.players[0]?.name && m.players[0].name !== '—') out.push({ name: m.players[0].name, club: m.players[0].club, seed: idx * 2 + 1 });
        if (m.players[1]?.name && m.players[1].name !== '—') out.push({ name: m.players[1].name, club: m.players[1].club, seed: idx * 2 + 2 });
        return out;
    });

    // Backend maç döndürmüyorsa ama atletler varsa → yerelden kur
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
function BackendBracketLoader({
                                  slug,
                                  enabled,
                                  refreshKey,
                                  onBuilt,
                                  pollMs = 30_000,
                              }: {
    slug: string;
    enabled: boolean;
    refreshKey: number;
    onBuilt: (m: Matrix, p: Participant[]) => void;
    pollMs?: number;
}) {
    useEffect(() => {
        if (!slug || !enabled) return;

        let mounted = true;
        let timer: number | null = null;

        const fetchAll = async () => {
            try {
                const [athRes, matchRes, clubsRes] = await Promise.all([
                    api.get<ApiAthlete[]>(`subtournaments/${slug}/athletes/`),
                    api.get<ApiMatch[]>(`subtournaments/${slug}/matches/`),
                    api.get<ClubRow[]>('clubs/').catch(() => ({ data: [] as ClubRow[] })),
                ]);
                if (!mounted) return;

                const athletes = Array.isArray(athRes.data) ? athRes.data : [];
                const matches  = Array.isArray(matchRes.data) ? matchRes.data : [];
                const clubs    = Array.isArray(clubsRes.data) ? clubsRes.data : [];

                const built = buildFromBackend(athletes, matches, clubs);
                onBuilt(propagate(built.matrix), built.firstRound);
            } catch {/* sessiz */}
        };

        void fetchAll();
        timer = window.setInterval(fetchAll, pollMs);

        return () => {
            mounted = false;
            if (timer) window.clearInterval(timer);
        };
    }, [slug, enabled, pollMs, refreshKey, onBuilt]);

    // refreshKey değişince tek seferlik fetch (poll kapalıyken de)
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        const once = async () => {
            try {
                const [athRes, matchRes, clubsRes] = await Promise.all([
                    api.get<ApiAthlete[]>(`subtournaments/${slug}/athletes/`),
                    api.get<ApiMatch[]>(`subtournaments/${slug}/matches/`),
                    api.get<ClubRow[]>('clubs/').catch(() => ({ data: [] as ClubRow[] })),
                ]);
                if (cancelled) return;
                const athletes = Array.isArray(athRes.data) ? athRes.data : [];
                const matches  = Array.isArray(matchRes.data) ? matchRes.data : [];
                const clubs    = Array.isArray(clubsRes.data) ? clubsRes.data : [];
                const built = buildFromBackend(athletes, matches, clubs);
                onBuilt(propagate(built.matrix), built.firstRound);
            } catch {/* noop */}
        };
        void once();
        return () => { cancelled = true; };
    }, [slug, refreshKey, onBuilt]);

    return null;
}

/* -------------------------------- Component ------------------------------- */
export default memo(function InteractiveBracket(){
    const { players, setPlayers }  = usePlayers();
    const { settings } = useSettings();
    const themeKey     = useBracketTheme();
    const palette:Palette = PALETTES[resolveThemeKey(themeKey)];

    const location = useLocation();
    const slug = useMemo(() => location.pathname.match(/^\/bracket\/(.+)/)?.[1] ?? '', [location.pathname]);
    const stateItem = (location.state as (SubTournament & { can_edit?: boolean }) | undefined) || null;
    const [subId, setSubId] = useState<number | null>(stateItem?.id ?? null);

    /* Mode & izin */
    const [mode, setMode] = useState<'view'|'edit'>('view');
    const [canEdit, setCanEdit] = useState<boolean>(Boolean(stateItem?.can_edit ?? true)); // istersen backend’le bağlarız
    const [refreshKey, setRefreshKey] = useState(0);

    /* Çizim matrisi */
    const [rounds, setRounds] = useState<Matrix>([]);
    const backendMatrixRef = useRef<Matrix>([]);

    const [selected, setSelected] = useState<{r:number;m:number}|null>(null);
    const [saving,setSaving]=useState(false);
    const [saveMsg, setSaveMsg]=useState<string|null>(null);

    const [dirty, setDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const handleBuilt = useCallback(
        (matrix: Matrix, firstRoundParticipants: Participant[]) => {
            backendMatrixRef.current = matrix;
            if (mode === 'view') setRounds(matrix);
            else if (!rounds.length) setRounds(matrix); // edit’e boş girildiyse bir defa doldur
            if (firstRoundParticipants.length && !players.length) setPlayers(firstRoundParticipants);
        },
        [mode, rounds.length, players.length, setPlayers]
    );

    // Zoom/pan
    const twRef = useRef<ReactZoomPanPinchRef | null>(null);

    // Slug → SubTournament id & izin al
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('bracket:view-only', { detail: { value: mode === 'view' } })
        );
        // İstersen CSS’ten de kullan
        document.documentElement.setAttribute('data-bracket-mode', mode);
    }, [mode]);

    useEffect(() => {
        if (!slug || subId) return;
        (async () => {
            try {
                const { data } = await api.get<any>(`subtournaments/${slug}/`);
                if (data?.id) setSubId(data.id);
                if (typeof data?.can_edit === 'boolean') setCanEdit(Boolean(data.can_edit));
            } catch {
                setSaveMsg('Alt turnuva bilgisi alınamadı (slug).');
            }
        })();
    }, [slug, subId]);

    /* Yerel katılımcılardan bracket kurma */
    useEffect(() => {
        const placement = settings.placementMap;

        if (mode === 'edit') {
            // Önce backend’ten gelen matrisi kullan; yoksa yerelden kur
            if (backendMatrixRef.current.length) {
                setRounds(backendMatrixRef.current);
            } else if (players.length) {
                setRounds(propagate(buildMatrix(players, placement)));
            } else {
                setRounds([]);
            }
            return;
        }

        // VIEW: backend gelmediyse ancak local oyuncu varsa yerelden kur
        if ((backendMatrixRef.current?.length ?? 0) === 0 && players.length) {
            setRounds(propagate(buildMatrix(players, placement)));
        } else {
            setRounds(backendMatrixRef.current);
        }
    }, [mode, players, settings.placementMap, settings.version]);

    /* Header/Sidebar’dan gelecek kontrol olayları */
    useEffect(() => {
        const enterEdit = () => {
            if (!canEdit) return;
            setMode('edit');
            // rounds boşsa tek seferlik doldur
            setRounds(prev => {
                if (prev.length) return prev;
                if (backendMatrixRef.current.length) return backendMatrixRef.current;
                if (players.length) return propagate(buildMatrix(players, settings.placementMap));
                return [];
            });
        };

        const enterView = () => {
            if (mode === 'edit' && dirty) {
                setShowExitConfirm(true);  // onay modalını aç
            } else {
                setMode('view');
            }
        };

        const refresh = () => setRefreshKey(k => k + 1);

        window.addEventListener('bracket:enter-edit', enterEdit);
        window.addEventListener('bracket:enter-view', enterView);
        window.addEventListener('bracket:refresh', refresh);

        return () => {
            window.removeEventListener('bracket:enter-edit', enterEdit);
            window.removeEventListener('bracket:enter-view', enterView);
            window.removeEventListener('bracket:refresh', refresh);
        };
    }, [canEdit, mode, dirty, players.length, settings.placementMap]);

    /* Kaydet (header’daki buton zaten bracket:save olayı atıyor) */
    const timeToISO = (t?: string): string | null => {
        if (!t) return null;
        const s = t.replace('.', ':');
        const m = s.match(/^(\d{2}):(\d{2})$/);
        if (!m) return null;
        const [, hh, mm] = m;
        const now = new Date();
        const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hh), Number(mm), 0, 0);
        return local.toISOString();
    };

    const persistBracket = useCallback(async () => {
        if (!slug) { setSaveMsg('Slug okunamadı.'); return; }
        if (!subId) { setSaveMsg('Alt turnuva ID bulunamadı.'); return; }
        if (!players.length) { setSaveMsg('Kaydedilecek katılımcı yok.'); return; }
        setSaving(true); setSaveMsg(null);
        try {
            let clubs: Club[] = [];
            try {
                const { data } = await api.get<Club[]>('clubs/');
                if (Array.isArray(data)) clubs = data;
            } catch { /* noop */ }
            const clubIdByName = new Map(clubs.map(c => [c.name.trim().toLowerCase(), c.id]));

            const sorted = [...players].sort((a,b)=>a.seed-b.seed);
            const athletePayload = sorted.map(p => ({
                first_name: p.name,
                last_name : 'Example',
                birth_year: 1453,
                weight    : '-1.00',
                gender    : 'M',
                club      : clubIdByName.get((p.club||'').trim().toLowerCase()) ?? null,
            }));
            const { data: created } = await api.post<Array<{id:number}>>('athletes/bulk/', athletePayload);
            if (!Array.isArray(created) || created.length !== sorted.length) {
                throw new Error('Athlete bulk sonucu beklenen sayıda değil.');
            }
            const seedToAthlete: Record<number, number> = {};
            created.forEach((a, idx) => { seedToAthlete[sorted[idx].seed] = a.id; });

            const roundsForSave: Matrix =
                (rounds.length ? rounds : propagate(buildMatrix(sorted as Participant[], settings.placementMap)));

            const matchPayload = roundsForSave.flatMap((round, rIdx) =>
                round.map((m, iIdx) => {
                    const a1Seed = m.players[0]?.seed || 0;
                    const a2Seed = m.players[1]?.seed || 0;
                    const a1 = a1Seed > 0 ? (seedToAthlete[a1Seed] ?? null) : null;
                    const a2 = a2Seed > 0 ? (seedToAthlete[a2Seed] ?? null) : null;
                    const winner =
                        m.players[0]?.winner ? a1 :
                            m.players[1]?.winner ? a2 : null;
                    const court_no = (() => {
                        const raw = m.meta?.court?.trim();
                        const n = raw ? parseInt(raw, 10) : NaN;
                        return Number.isFinite(n) ? n : null;
                    })();
                    const scheduled_at = timeToISO(m.meta?.time);
                    return {
                        round_no    : rIdx + 1,
                        position    : iIdx + 1,
                        court_no,
                        scheduled_at: scheduled_at ?? undefined,
                        extra_note  : '',
                        sub_tournament: subId,
                        athlete1    : a1,
                        athlete2    : a2,
                        winner      : winner ?? null,
                    };
                })
            );
            await api.post('matches/bulk/', matchPayload);
            setDirty(false);
            setSaveMsg('Kaydedildi.');
            setMode('view');
            setRefreshKey(k => k + 1);
        } catch (e) {
            setSaveMsg(e instanceof Error ? e.message : 'Kaydetme sırasında hata oluştu.');
        } finally {
            setSaving(false);
            setTimeout(()=>setSaveMsg(null), 2500);
        }
    }, [slug, subId, players, rounds, settings.placementMap]);

    useEffect(() => {
        const h = () => { if (!saving) void persistBracket(); };
        window.addEventListener('bracket:save', h);
        return () => window.removeEventListener('bracket:save', h);
    }, [persistBracket, saving]);

    /* Layout hesapları */
    const layout=useMemo<Pos[][]>(()=>rounds.map((round,r)=>{
        const span=BASE<<r;
        return round.map((_,i)=>{
            const mid=BASE+span+i*span*2;
            return {mid,y1:mid-span/2,y2:mid+span/2};
        });
    }),[rounds]);

    const svgHeight = Math.max(((layout[0]?.at(-1)?.mid ?? 0) + BASE), 420);
    const svgWidth  = Math.max((56 + rounds.length*(BOX_W+GAP) + 200), 820);

    const STAGE_PAD = 400;
    const stageW = svgWidth  + STAGE_PAD * 2;
    const stageH = svgHeight + STAGE_PAD * 2;

    const INITIAL_POS = { left: 320, top: 120, scale: 1 };
    const applied = useRef(false);
    useEffect(() => {
        if (!twRef.current || applied.current) return;
        const x = -(STAGE_PAD - INITIAL_POS.left);
        const y = -(STAGE_PAD - INITIAL_POS.top);
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 0);
        applied.current = true;
    }, [stageW, stageH]);

    const saveMeta=(meta:Meta)=>{
        if(!selected) return;
        setRounds(prev=>{
            const copy:Matrix=prev.map(rnd=>rnd.map(m=>({
                players:m.players.map(p=>({...p})),
                meta:m.meta?{...m.meta}:undefined
            })));
            copy[selected.r][selected.m].meta=meta;
            return propagate(copy);
        });
        setDirty(true);
        setSelected(null);
    };

    const resetView = () => {
        if (!twRef.current) return;
        const x = -(STAGE_PAD - INITIAL_POS.left);
        const y = -(STAGE_PAD - INITIAL_POS.top);
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 300);
    };

    const isBackend = !!slug;
    const pollingEnabled = isBackend && mode === 'view';

    return (
        <div className="relative">
            {/* Backend verisini yükle (View modunda/poll açıkken) */}
            {isBackend && (
                <BackendBracketLoader
                    slug={slug}
                    enabled={pollingEnabled}
                    refreshKey={refreshKey}
                    onBuilt={handleBuilt}
                    pollMs={30_000}
                />
            )}

            {/* SAĞ ÜSTTE SADECE MOD ETİKETİ (tıklanamaz) */}
            <div className="absolute right-3 top-3 z-[40] pointer-events-none select-none">
        <span className="px-2 py-1 rounded text-xs bg-white/10 text-white/90">
          Mode: <b>{mode.toUpperCase()}</b>
        </span>
            </div>

            <TransformWrapper
                ref={twRef}
                minScale={0.4}
                maxScale={3.5}
                limitToBounds={false}
                centerOnInit={false}
                doubleClick={{ disabled: true }}
                panning={{ velocityDisabled: true }}
                wheel={{ step: 120 }}
                pinch={{ step: 10 }}
            >
                <TransformComponent
                    wrapperStyle={{ width: '100%', minHeight: '600px', height: '70vh', overflow: 'visible' }}
                    contentStyle={{ overflow: 'visible' }}
                >
                    <div style={{ width: stageW, height: stageH, position: 'relative' }}>
                        {(!rounds || rounds.length === 0) ? (
                            <div
                                style={{ position:'absolute', left: STAGE_PAD, top: STAGE_PAD }}
                                className="text-white/70 text-sm"
                            >
                                Henüz gösterilecek maç bulunamadı. {mode === 'edit'
                                ? 'Sol panelden sporcu ekleyin; bracket otomatik oluşacak.'
                                : 'Veri gelene kadar bekleyin veya Edit moduna geçip sporcu ekleyin.'}
                            </div>
                        ) : (
                            <svg
                                width={svgWidth}
                                height={svgHeight}
                                style={{ position: 'absolute', left: STAGE_PAD, top: STAGE_PAD }}
                            >
                                <defs>
                                    <style>{`
                    .rect{fill:${palette.bg}}
                    .bar {fill:${palette.bar}}
                    .mid {stroke:${palette.bar};stroke-width:1.4}
                    .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
                    .txt {font:600 17px/1 Inter,sans-serif;fill:${palette.txt};dominant-baseline:middle}
                    .sub {font:600 12px/1 Inter,sans-serif;fill:#9aa4b2;dominant-baseline:middle}
                    .win {fill:${palette.win}}
                    .outline{stroke:url(#g);fill:none;stroke-width:0}
                    .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${palette.glow2})}
                    .done {opacity:.55}
                    .tick {fill:#22c55e}
                    .seed {font:600 12px/1 Inter,sans-serif;fill:#fff;opacity:.9}
                  `}</style>
                                    <linearGradient id="g" x1="0" x2="1">
                                        <stop offset="0%" stopColor={palette.glow1}/>
                                        <stop offset="100%" stopColor={palette.glow2}/>
                                    </linearGradient>
                                </defs>

                                {rounds.map((round, r) => {
                                    const x0base = 64 + r * (BOX_W + GAP);
                                    const x1 = x0base + BOX_W + GAP;
                                    return round.map((m, i) => {
                                        const span = BASE << r;
                                        const mid = BASE + span + i * span * 2;
                                        const y1 = mid - span / 2;
                                        const y2 = mid + span / 2;

                                        const sets = m.meta?.scores;
                                        const scoreText = (idx: 0 | 1) =>
                                            (sets ?? []).map(s => String(s[idx] ?? 0)).join('·');
                                        const bothHaveNames = m.players.every(p => p.name && p.name !== '—');
                                        const finished = m.players.some(p => p.winner != null);
                                        const x0 = x0base;

                                        return (
                                            <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                                                {/* seed numaraları */}
                                                {m.players.map((p, idx) => (
                                                    (p.seed > 0 && p.name !== '—') ? (
                                                        <text
                                                            key={`seed-${idx}`}
                                                            className="seed"
                                                            x={x0 - 14}
                                                            y={mid + (idx ? 22 : -22)}
                                                            textAnchor="end"
                                                        >
                                                            {p.seed}
                                                        </text>
                                                    ) : null
                                                ))}

                                                <rect className="rect" x={x0} y={mid - BOX_H / 2} width={BOX_W} height={BOX_H} rx={CORNER}/>
                                                <rect className="bar"  x={x0 - 8} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER}/>
                                                {m.players.some(p => p.winner) && (
                                                    <rect className="win" x={x0 + BOX_W} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER}/>
                                                )}
                                                <line className="mid" x1={x0} x2={x0 + BOX_W} y1={mid} y2={mid}/>

                                                {m.players.map((p, idx) => {
                                                    const y = mid + (idx ? 22 : -22);
                                                    return (
                                                        <g key={idx}>
                                                            <text className="txt" x={x0 + 18} y={y}>
                                                                <tspan>{p.name}</tspan>
                                                                {p.winner && <tspan className="tick" dx="8">✓</tspan>}
                                                            </text>
                                                            {!!p.club && (
                                                                <text className="sub" x={x0 + 18} y={y + 16}>
                                                                    {p.club.length > 16 ? `${p.club.slice(0, 15)}…` : p.club}
                                                                </text>
                                                            )}
                                                        </g>
                                                    );
                                                })}

                                                {/* Skorlar */}
                                                {sets?.length && (
                                                    m.players.map((_, idx) => (
                                                        <text
                                                            key={`s-${idx}`}
                                                            className="txt"
                                                            fontSize={13}
                                                            x={x0 + BOX_W - 10}
                                                            y={mid + (idx ? 22 : -22)}
                                                            textAnchor="end"
                                                        >
                                                            {scoreText(idx as 0 | 1)}
                                                        </text>
                                                    ))
                                                )}

                                                {/* Saat/Kort */}
                                                {m.meta?.time && (
                                                    <text className="sub" x={x0 + BOX_W - 10} y={mid - BOX_H / 2 + 14} textAnchor="end">
                                                        {m.meta.time}
                                                    </text>
                                                )}
                                                {m.meta?.court && (
                                                    <text className="sub" x={x0 + BOX_W - 10} y={mid + BOX_H / 2 - 12} textAnchor="end">
                                                        Court {m.meta.court}
                                                    </text>
                                                )}

                                                <line className="ln" x1={x0 - 8} y1={y1} x2={x0 - 8} y2={y2}/>
                                                <line className="ln" x1={x0 - 8} y1={mid} x2={x0} y2={mid}/>
                                                {r < rounds.length - 1 && (
                                                    <line className="ln" x1={x0 + BOX_W + 8} y1={mid} x2={x1 - 8} y2={mid}/>
                                                )}

                                                {/* Tıklanabilir alan (sadece Edit modunda) */}
                                                {mode === 'edit' && (
                                                    <rect
                                                        className="hit"
                                                        x={x0}
                                                        y={mid - BOX_H / 2}
                                                        width={BOX_W}
                                                        height={BOX_H}
                                                        fill="transparent"
                                                        onClick={() => setSelected({ r, m: i })}
                                                    />
                                                )}
                                                <rect
                                                    className="outline"
                                                    x={x0 - 8}
                                                    y={mid - BOX_H / 2}
                                                    width={BOX_W + 16}
                                                    height={BOX_H}
                                                    rx={CORNER + 2}
                                                />
                                            </g>
                                        );
                                    });
                                })}
                            </svg>
                        )}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {/* Reset */}
            <button
                onClick={resetView}
                title="Şablonu ilk konuma getir"
                aria-label="Şablonu sıfırla"
                className="fixed bottom-4 right-4 z-[35] w-12 h-12 rounded-full border border-white/25 text-white
                 bg-[#0f1217]/95 hover:bg-[#0f1217] shadow flex items-center justify-center"
            >
                <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
                    <circle cx="12" cy="12" r="2.5"></circle>
                </svg>
            </button>

            {/* Skor girişi modalı (sadece Edit modunda) */}
            {mode === 'edit' && selected && (
                <MatchModal
                    match={rounds[selected.r][selected.m]}
                    onSave={saveMeta}
                    onClose={() => setSelected(null)}
                />
            )}

            {showExitConfirm && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
                    <div className="bg-[#0f1217] text-white rounded-lg p-4 w-[380px] shadow-xl border border-white/10">
                        <div className="font-semibold text-base mb-2">
                            Yaptığınız değişiklikleri kaydetmek ister misiniz?
                        </div>
                        <div className="text-sm text-white/80 mb-4">Edit modundan çıkılıyor.</div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                                onClick={() => setShowExitConfirm(false)}
                            >
                                Vazgeç
                            </button>
                            <button
                                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    // Değişiklikleri at ve view’a dön
                                    setMode('view');
                                    setRounds(backendMatrixRef.current);
                                    setDirty(false);
                                }}
                            >
                                Kaydetme
                            </button>
                            <button
                                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500"
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    void persistBracket(); // Kaydet ve view’a geç
                                }}
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {saveMsg && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[50] px-4 py-2 rounded bg-black/70 text-white text-sm">
                    {saveMsg}
                </div>
            )}
        </div>
    );
});
