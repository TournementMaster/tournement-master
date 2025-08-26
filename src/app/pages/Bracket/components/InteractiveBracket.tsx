// =============================
// FILE: InteractiveBracket.tsx
// =============================
import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
    TransformWrapper,
    TransformComponent,
    type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
import { useBracketTheme, type BracketThemeKey } from '../../../context/BracketThemeContext'
import { PALETTES, type ThemeKey, type Palette } from '../../../context/themePalettes'
import { usePlayers, type Participant } from '../../../hooks/usePlayers'
import { useSettings } from '../../../context/BracketSettingsCtx'
import { useLocation } from 'react-router-dom'
import { api } from '../../../lib/api'
import type { Club } from '../../../models/Club'
import type { SubTournament } from '../../../hooks/useSubTournaments'
import { useAuth } from '../../../context/useAuth'

/* --------------------------------- Types --------------------------------- */
export interface Player {
    seed: number
    name: string
    club?: string
    winner?: boolean
    athleteId?: number | null
}
export interface Meta { scores?: [number, number][]; manual?: 0 | 1; time?: string; court?: string; matchNo?: number }
export interface Match { players: Player[]; meta?: Meta }
type Matrix = Match[][]

type ApiAthlete = {
    id: number; first_name: string; last_name: string;
    birth_year: number; weight: string | number; gender: 'M' | 'F' | string;
    club: number | null;
}
type ApiMatchSet = { id: number; set_no: number; a1_score: number; a2_score: number; match: number }
type ApiMatch = {
    id: number; sets: ApiMatchSet[];
    round_no: number; position: number;
    court_no: number | null; scheduled_at: string | null; extra_note: string;
    sub_tournament: number; athlete1: number | null; athlete2: number | null; winner: number | null;
    match_no?: number | null;
}
type ClubRow = { id: number; name: string; city?: string }

/* ----------------------------- Layout constants -------------------------- */
const BOX_W = 340
const BOX_H = 78
const GAP   = 120
const BASE  = BOX_H
const CORNER = 10
type Pos = { mid:number; y1:number; y2:number }

/* ----------------------------- Winner Modal ------------------------------ */
function BigTick({ checked, onClick, title }: { checked: boolean; onClick: () => void; title?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl
      ${checked ? 'bg-emerald-500/30 border-emerald-400' : 'bg-[#1f2229] border-white/10 hover:border-emerald-300'}`}
        >
            {checked ? '✓' : ''}
        </button>
    )
}

function WinnerModal({
                         open, match, onPick, onReset, onClose,
                     }: {
    open: boolean
    match: Match | null
    onPick: (manualIndex: 0 | 1) => void
    onReset: () => void
    onClose: () => void
}) {
    if (!open || !match) return null
    const { players, meta } = match
    const winnerIdx = typeof meta?.manual === 'number' ? meta!.manual : (players[0]?.winner ? 0 : players[1]?.winner ? 1 : undefined)

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
            <div className="w-[560px] max-w-[92vw] rounded-xl bg-[#2b2f36] border border-white/10 shadow-2xl">
                <div className="px-5 py-3 border-b border-white/10 text-white font-semibold tracking-wide">Report Scores</div>

                <div className="p-5 space-y-4">
                    {players.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="text-white/70 w-6 text-right">{idx === 0 ? '1' : '2'}</div>
                            <div className="flex-1">
                                <div className="w-full h-10 rounded-md bg-[#1f2229] text-white/90 flex items-center px-4 select-none">
                                    {p?.name ?? '—'}
                                </div>
                            </div>
                            <BigTick
                                checked={winnerIdx === idx}
                                title="Kazanan olarak işaretle"
                                onClick={() => onPick(idx as 0 | 1)}
                            />
                        </div>
                    ))}

                    <div className="pt-2 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onReset}
                            className="text-sm text-red-400 hover:text-red-300"
                        >
                            Reset
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 h-10 rounded-md bg-[#1f2229] border border-white/10 text-white/80 hover:border-white/30"
                            >
                                Kapat
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 h-10 rounded-md bg-sky-600 text-white hover:bg-sky-500"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* -------------------------------- Helpers -------------------------------- */
function blank(): Match { return { players:[{seed:0,name:'—'},{seed:0,name:'—'}] } }

function seedOrder(size:number): number[] {
    if (size < 2) return [1]
    let prev = [1,2]
    while (prev.length < size) {
        const n = prev.length * 2
        const comp = prev.map(x => n + 1 - x)
        const next:number[] = []
        for (let i=0;i<prev.length;i+=2){
            const a = prev[i],   b = prev[i+1]
            const A = comp[i],   B = comp[i+1]
            next.push(a, A, B, b)
        }
        prev = next
    }
    return prev
}
function nextPowerOfTwo(n: number) { let s=1; while(s<n) s<<=1; return Math.max(4,s) }

function samePlayersList(a: Participant[], b: Participant[]) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if ((a[i]?.name || '') !== (b[i]?.name || '')) return false
        if ((a[i]?.club || '') !== (b[i]?.club || '')) return false
    }
    return true
}

/* Küçük yardımcı: renk açıklığı */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = hex.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i)
    if (!m) return null
    let h = m[1]
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    const num = parseInt(h, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
function isLightColor(c: string): boolean {
    const rgb = hexToRgb(c)
    if (!rgb) return false
    // WCAG relative luminance approx
    const sRGB = [rgb.r, rgb.g, rgb.b].map(v => {
        const x = v / 255
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    const L = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
    return L > 0.6
}

/* Yerelden ilk turu kur */
function buildMatrix(participants: Participant[], placementMap: Record<number,number>|null): Matrix {
    const n = participants.length
    const size = nextPowerOfTwo(n)
    const order = seedOrder(size)

    const slotToPlayer = new Map<number, Player>()
    for (const p of participants) {
        const slotSeed = placementMap?.[p.seed] ?? p.seed
        slotToPlayer.set(slotSeed, { seed: p.seed, name: p.name, club: p.club })
    }

    const r0: Match[] = []
    for (let i=0; i<order.length; i+=2){
        const a = slotToPlayer.get(order[i])   ?? { seed:0, name:'—' }
        const b = slotToPlayer.get(order[i+1]) ?? { seed:0, name:'—' }
        r0.push({ players: [a, b] })
    }

    const rounds: Matrix = [r0]
    let games = size/4
    while (games >= 1) { rounds.push(Array(games).fill(0).map(blank)); games /= 2 }
    return rounds
}

/* Kazananları sonraki tura taşı — ⚠ reset sonrası otomatik atama kalıntısı kalmasın */
function propagate(matrix: Matrix): Matrix {
    // 1) Derin kopya + üst turların oyuncularını temizle
    const mat: Matrix = matrix.map((r) =>
        r.map(m => ({
            players: m.players.map(p => ({ ...p })),
            meta: m.meta ? { ...m.meta, scores: m.meta.scores ? [...m.meta.scores] as [number, number][] : undefined } : undefined,
        }))
    )
    for (let r = 1; r < mat.length; r++) {
        for (let i = 0; i < mat[r].length; i++) {
            mat[r][i].players = [{ seed:0, name:'—' }, { seed:0, name:'—' }]
            mat[r][i].players[0].winner = undefined
            mat[r][i].players[1].winner = undefined
        }
    }

    // 2) Tüm turları sırayla işle, winner varsa üst tura yerleştir
    for (let r = 0; r < mat.length; r++) {
        mat[r].forEach((m, idx) => {
            const [p1, p2] = m.players
            let winner: 0 | 1 | undefined

            if (r === 0) {
                const aBye = p1.seed === 0 || p1.name === '—'
                const bBye = p2.seed === 0 || p2.name === '—'
                if (aBye && !bBye) winner = 1
                else if (bBye && !aBye) winner = 0
            }

            if (winner == null && m.meta?.manual != null) winner = m.meta.manual
            if (winner == null && m.meta?.scores?.length) {
                const [a, b] = m.meta.scores[0]
                if (a !== b) winner = a > b ? 0 : 1
            }

            if (winner != null) {
                m.players[winner] = { ...m.players[winner], winner: true }
                m.players[1 - winner] = { ...m.players[1 - winner], winner: false }
                if (r < mat.length - 1) {
                    const next = mat[r + 1][Math.floor(idx / 2)]
                    const moved = { ...m.players[winner] }; delete (moved as any).winner
                    next.players[idx % 2] = moved
                }
            } else {
                m.players[0] = { ...m.players[0], winner: undefined }
                m.players[1] = { ...m.players[1], winner: undefined }
            }
        })
    }
    return mat
}

/* Tema anahtarı çözümle */
function resolveThemeKey(k: BracketThemeKey): ThemeKey {
    switch (k) {
        case 'classic-dark':
        case 'classic-light': return 'classic'
        case 'modern-dark':
        case 'modern-light':  return 'purple'
        case 'purple-orange': return 'orange'
        case 'black-white':   return 'invert'
        case 'ocean':   return 'ocean'
        case 'forest':  return 'forest'
        case 'rose':    return 'rose'
        case 'gold':    return 'gold'
        case 'crimson': return 'crimson'
        case 'teal':    return 'teal'
        case 'slate':   return 'slate'
        default:        return 'classic'
    }
}

/* ISO → HH.MM */
function toHHMM(iso: string | null | undefined): string | undefined {
    if (!iso) return undefined
    const d = new Date(iso)
    if (isNaN(d.getTime())) return undefined
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}.${mm}`
}

/* ------------------------- Backend → Matrix builder ----------------------- */
function buildFromBackend(
    athletes: ApiAthlete[],
    matches: ApiMatch[],
    clubs: ClubRow[],
): { matrix: Matrix; firstRound: Participant[] } {
    const clubMap = new Map<number, string>()
    clubs.forEach(c => clubMap.set(c.id, c.name))

    const aMap = new Map<number, { name: string; club?: string }>()
    athletes.forEach(a => {
        const name = (a.first_name || '').trim() || `${a.first_name} ${a.last_name}`.trim() || '—'
        const club = a.club != null ? clubMap.get(a.club) : undefined
        aMap.set(a.id, { name, club })
    })

    const maxRound = matches.length ? Math.max(...matches.map(m => m.round_no)) : 0
    const matrix: Matrix = maxRound ? Array.from({ length: maxRound }, () => []) : []

    for (let r = 1; r <= maxRound; r++) {
        const inRound = matches.filter(m => m.round_no === r);

        // ▼ Aynı (round, position) için EN SON id'li kaydı tut
        const latestByPos = new Map<number, ApiMatch>();
        for (const m of inRound) {
            const prev = latestByPos.get(m.position);
            if (!prev || (m.id ?? 0) > (prev.id ?? 0)) latestByPos.set(m.position, m);
        }

        const positions = [...latestByPos.keys()];
        const maxPos = positions.length ? Math.max(...positions) : 0;
        matrix[r - 1] = Array.from({ length: maxPos }, () => blank());

        // pozisyona göre sırala ve doldur
        positions.sort((a, b) => a - b).forEach((pos) => {
            const m = latestByPos.get(pos)!;

            const p1 = m.athlete1 ? (aMap.get(m.athlete1) ?? { name: '—' }) : { name: '—' };
            const p2 = m.athlete2 ? (aMap.get(m.athlete2) ?? { name: '—' }) : { name: '—' };

            const players: Player[] = [
                { seed: 0, name: p1.name, club: p1.club, athleteId: m.athlete1 ?? null },
                { seed: 0, name: p2.name, club: p2.club, athleteId: m.athlete2 ?? null },
            ];

            const meta: Meta = {};
            if (Array.isArray(m.sets) && m.sets.length) meta.scores = m.sets.map(s => [s.a1_score, s.a2_score]);

            const t = toHHMM(m.scheduled_at); if (t) meta.time = t;
            if (m.court_no != null) meta.court = String(m.court_no);
            if (typeof m.match_no === 'number' && Number.isFinite(m.match_no)) meta.matchNo = m.match_no;

            if (m.winner != null) {
                if (m.winner === m.athlete1) { players[0] = { ...players[0], winner: true }; players[1] = { ...players[1], winner: false }; meta.manual = 0; }
                else if (m.winner === m.athlete2) { players[1] = { ...players[1], winner: true }; players[0] = { ...players[0], winner: false }; meta.manual = 1; }
            }

            matrix[r - 1][pos - 1] = { players, meta };
        });
    }

    const firstRound: Participant[] = (matrix[0] ?? []).flatMap((m, idx) => {
        const out: Participant[] = []
        if (m.players[0]?.name && m.players[0].name !== '—') out.push({ name: m.players[0].name, club: m.players[0].club, seed: idx * 2 + 1 })
        if (m.players[1]?.name && m.players[1].name !== '—') out.push({ name: m.players[1].name, club: m.players[1].club, seed: idx * 2 + 2 })
        return out
    })

    if (!matrix.length && athletes.length) {
        const fallbackParticipants: Participant[] = athletes.map((a, i) => ({
            name: (a.first_name || '').trim() || `${a.first_name} ${a.last_name}`.trim() || '—',
            club: a.club != null ? clubMap.get(a.club) : undefined,
            seed: i + 1,
        }))
        const mtx = buildMatrix(fallbackParticipants, null)
        return { matrix: mtx, firstRound: fallbackParticipants }
    }

    return { matrix, firstRound }
}

/* --------------------------- Backend data loader -------------------------- */
function BackendBracketLoader({
                                  slug, enabled, refreshKey, onBuilt, pollMs = 30_000, onAuthError,
                              }: {
    slug: string
    enabled: boolean
    refreshKey: number
    onBuilt: (m: Matrix, p: Participant[]) => void
    pollMs?: number
    onAuthError?: (status:number)=>void
}) {
    useEffect(() => {
        if (!slug || !enabled) return
        let mounted = true
        let timer: number | null = null

        const fetchAll = async () => {
            try {
                const [athRes, matchRes, clubsRes] = await Promise.all([
                    api.get<ApiAthlete[]>(`subtournaments/${slug}/athletes/`),
                    api.get<ApiMatch[]>(`subtournaments/${slug}/matches/`),
                    api.get<ClubRow[]>('clubs/').catch(() => ({ data: [] as ClubRow[] })),
                ])
                if (!mounted) return
                const built = buildFromBackend(
                    Array.isArray(athRes.data) ? athRes.data : [],
                    Array.isArray(matchRes.data) ? matchRes.data : [],
                    Array.isArray(clubsRes.data) ? clubsRes.data : []
                )
                onBuilt(propagate(built.matrix), built.firstRound)
            } catch (e:any) {
                const code = e?.response?.status
                if (code === 401 && onAuthError) onAuthError(401)
            }
        }

        void fetchAll()
        timer = window.setInterval(fetchAll, pollMs)
        return () => { mounted = false; if (timer) window.clearInterval(timer) }
    }, [slug, enabled, pollMs, refreshKey, onBuilt, onAuthError])

    useEffect(() => {
        if (!slug) return
        let cancelled = false
        const once = async () => {
            try {
                const [athRes, matchRes, clubsRes] = await Promise.all([
                    api.get<ApiAthlete[]>(`subtournaments/${slug}/athletes/`),
                    api.get<ApiMatch[]>(`subtournaments/${slug}/matches/`),
                    api.get<ClubRow[]>('clubs/').catch(() => ({ data: [] as ClubRow[] })),
                ])
                if (cancelled) return
                const built = buildFromBackend(
                    Array.isArray(athRes.data) ? athRes.data : [],
                    Array.isArray(matchRes.data) ? matchRes.data : [],
                    Array.isArray(clubsRes.data) ? clubsRes.data : []
                )
                onBuilt(propagate(built.matrix), built.firstRound)
            } catch (e:any) {
                const code = e?.response?.status
                if (code === 401 && onAuthError) onAuthError(401)
            }
        }
        void once()
        return () => { cancelled = true }
    }, [slug, refreshKey, onBuilt, onAuthError])

    return null
}

/* -------------------------------- Component ------------------------------- */
export default memo(function InteractiveBracket(){
    const { players, setPlayers }  = usePlayers()
    const { settings } = useSettings()
    const themeKey     = useBracketTheme()
    const palette:Palette = PALETTES[resolveThemeKey(themeKey)]
    const { isAuth } = useAuth()

    const location = useLocation()
    const slug = useMemo(() => location.pathname.match(/^\/bracket\/(.+)/)?.[1] ?? '', [location.pathname])
    const stateItem = (location.state as (SubTournament & { can_edit?: boolean }) | undefined) || null
    const [subId, setSubId] = useState<number | null>(stateItem?.id ?? null)

    const [tournamentSlug, setTournamentSlug] = useState<string | null>(null)

    const pendingMetaRef = useRef<null | { r: number; m: number; meta: Meta }>(null)

    const [mode, setMode] = useState<'view'|'edit'>('view')
    const [canEdit, setCanEdit] = useState<boolean>(Boolean(stateItem?.can_edit ?? true))
    const [refreshKey, setRefreshKey] = useState(0)

    const [defaultCourtNo, setDefaultCourtNo] = useState<number | null>(null)

    type SubTournamentDetail = SubTournament & {
        started?: boolean; can_edit?: boolean; court_no?: number | null;
        tournament_public_slug?: string | null; tournament_slug?: string | null; tournament?: any;
    }

    const [started, setStarted] = useState<boolean>(Boolean((stateItem as any)?.started ?? false))
    const startedRef = useRef<boolean>(started)
    useEffect(() => { startedRef.current = started }, [started])
    const [startedKnown, setStartedKnown] = useState<boolean>(typeof (stateItem as any)?.started === 'boolean')

    const [rounds, setRounds] = useState<Matrix>([])
    const isFinished = useMemo(() => {
        if (!rounds?.length) return false
        const lastRound = rounds[rounds.length - 1]
        if (!lastRound?.length) return false
        const finalMatch = lastRound[0]
        return finalMatch?.players?.some(p => p?.winner != null) ?? false
    }, [rounds])
    const backendMatrixRef = useRef<Matrix>([])

    const [selected, setSelected] = useState<{r:number;m:number}|null>(null)
    const [saving,setSaving]=useState(false)
    const [saveMsg, setSaveMsg]=useState<string|null>(null)
    const [dirty, setDirty] = useState(false)
    const [showExitConfirm, setShowExitConfirm] = useState(false)

    const editPlayersSnapshotRef = useRef<Participant[] | null>(null)
    const editBaselineRef = useRef<{ playersLen: number } | null>(null)
    const lastPlacementRef = useRef<Record<number, number> | null>(null)

    // 🔐 401 durumunu tut
    const [authErr, setAuthErr] = useState<number | null>(null)

    // 🔎 highlight (sidebar arama)
    const [highlight, setHighlight] = useState<string>('')
    useEffect(() => {
        const h = (e:any) => setHighlight((e.detail?.name || '').toString().toLowerCase())
        window.addEventListener('bracket:highlight', h)
        return () => window.removeEventListener('bracket:highlight', h)
    }, [])

    const handleBuilt = useCallback(
        (matrix: Matrix, firstRoundParticipants: Participant[]) => {
            backendMatrixRef.current = matrix
            if (mode === 'view') setRounds(matrix)
            else if (!rounds.length) setRounds(matrix)
            if (firstRoundParticipants.length && !players.length) {
                const reseeded = firstRoundParticipants.map((p, i) => ({ ...p, seed: i + 1 }))
                setPlayers(reseeded)
            }
        },
        [mode, rounds.length, players.length, setPlayers]
    )

    const twRef = useRef<ReactZoomPanPinchRef | null>(null)

    // ⬇️ Şablonu Sıfırla butonundan gelecek sert sıfırlama (backend + local)
    useEffect(() => {
        const hardReset = async () => {
            if (!slug) return
            setSaveMsg('Şablon temizleniyor…')
            try {
                await api.delete(`subtournaments/${slug}/matches/`)
            } catch {
                try { await api.delete('matches/bulk/', { params: { sub_tournament: subId } }) } catch {}
            }
            // Lokal state'i de temizle
            backendMatrixRef.current = []
            setRounds([])
            setSelected(null)
            setDirty(false)
            setPlayers([])
            setStarted(false)
            editPlayersSnapshotRef.current = null
            lastPlacementRef.current = null

            setSaveMsg('Şablon sıfırlandı')
            setTimeout(() => setSaveMsg(null), 1500)
        }
        window.addEventListener('bracket:hard-reset', hardReset)
        return () => window.removeEventListener('bracket:hard-reset', hardReset)
    }, [slug, subId, setPlayers])

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('bracket:view-only', { detail: { value: mode === 'view' } }))
        document.documentElement.setAttribute('data-bracket-mode', mode)
    }, [mode])

    // otomatik mod: auth + izin → edit
    const autoModeAppliedRef = useRef(false)
    useEffect(() => {
        if (autoModeAppliedRef.current) return
        setMode(isAuth && canEdit ? 'edit' : 'view')
        autoModeAppliedRef.current = true
    }, [isAuth, canEdit])

    useEffect(() => {
        if (!isAuth && mode === 'edit') {
            setMode('view')
            editPlayersSnapshotRef.current = null
        }
    }, [isAuth, mode])

    useEffect(() => {
        const participantsViewOnly = (mode === 'view') || startedRef.current
        window.dispatchEvent(new CustomEvent('bracket:view-only', { detail: { value: participantsViewOnly } }))
        window.dispatchEvent(new CustomEvent('bracket:players-locked', { detail: { value: startedRef.current } }))
        window.dispatchEvent(new CustomEvent('bracket:sidebar-mode', { detail: { mode } }))
    }, [mode, started])

    useEffect(() => {
        if (!slug || subId) return;
        (async () => {
            try {
                const { data } = await api.get<SubTournamentDetail>(`subtournaments/${slug}/`)
                if (data?.id) setSubId(data.id)
                const tSlug = (data as any)?.tournament_public_slug ?? (data as any)?.tournament_slug ?? (data as any)?.tournament?.public_slug ?? null
                if (typeof tSlug === 'string' && tSlug) setTournamentSlug(tSlug)
                if (typeof data?.can_edit === 'boolean') setCanEdit(Boolean(data.can_edit))
                if (Object.prototype.hasOwnProperty.call(data, 'started')) { setStarted(Boolean(data.started)); setStartedKnown(true) }
                else if (Object.prototype.hasOwnProperty.call(data as any, 'has_started')) { setStarted(Boolean((data as any).has_started)); setStartedKnown(true) }
                if (Object.prototype.hasOwnProperty.call(data as any, 'court_no')) { setDefaultCourtNo((data as any).court_no ?? null) }
            } catch (e:any) {
                const code = e?.response?.status
                if (code === 401) setAuthErr(401)
                else setSaveMsg('Alt turnuva bilgisi alınamadı (slug).')
            }
        })()
    }, [slug, subId])

    /* Bracket kaynağı seçimi */
    useEffect(() => {
        const placement = settings.placementMap
        if (mode === 'edit') {
            if (startedRef.current) { setRounds(backendMatrixRef.current); return }
            const snap = editPlayersSnapshotRef.current
            const now  = players.map(p => ({ name: p.name, club: p.club, seed: p.seed }))
            const placementChanged = lastPlacementRef.current !== placement
            if (!snap || !samePlayersList(snap, now) || placementChanged) {
                setRounds(players.length ? propagate(buildMatrix(players, placement)) : [])
                editPlayersSnapshotRef.current = now
                lastPlacementRef.current = placement
            }
            return
        }
        if (backendMatrixRef.current.length) setRounds(backendMatrixRef.current)
        else if (players.length) setRounds(propagate(buildMatrix(players, placement)))
        else setRounds([])
    }, [mode, players, settings.placementMap, settings.version, started])

    useEffect(() => {
        if (mode !== 'edit') return
        const base = editBaselineRef.current?.playersLen ?? players.length
        if (players.length !== base) setDirty(true)
    }, [players.length, mode])
    useEffect(() => {
        if (mode === 'edit' && !startedRef.current) setDirty(true)
    }, [players])

    /* Header olayları (kalsın) */
    useEffect(() => {
        const enterEdit = () => {
            if (!canEdit) return
            editPlayersSnapshotRef.current = players.map(p => ({ name: p.name, club: p.club, seed: p.seed }))
            setMode('edit')
            setRounds(() => (backendMatrixRef.current.length ? backendMatrixRef.current : (players.length ? propagate(buildMatrix(players, settings.placementMap)) : [])))
        }
        const enterView = () => {
            if (mode === 'edit' && dirty) setShowExitConfirm(true)
            else { setMode('view'); editPlayersSnapshotRef.current = null }
        }
        const refresh = () => setRefreshKey(k => k + 1)
        window.addEventListener('bracket:enter-edit', enterEdit)
        window.addEventListener('bracket:enter-view', enterView)
        window.addEventListener('bracket:refresh', refresh)
        return () => {
            window.removeEventListener('bracket:enter-edit', enterEdit)
            window.removeEventListener('bracket:enter-view', enterView)
            window.removeEventListener('bracket:refresh', refresh)
        }
    }, [canEdit, mode, dirty, players, settings.placementMap])

    /* Kaydet */
    const timeToISO = (t?: string): string | null => {
        if (!t) return null
        const s = t.replace('.', ':')
        const m = s.match(/^(\d{2}):(\d{2})$/); if (!m) return null
        const [, hh, mm] = m
        const now = new Date()
        const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hh), Number(mm), 0, 0)
        return local.toISOString()
    }

    const persistBracket = useCallback(async () => {
        if (!slug) { setSaveMsg('Slug okunamadı.'); return }
        if (!subId) { setSaveMsg('Alt turnuva ID bulunamadı.'); return }
        if (!players.length && !startedRef.current) { setSaveMsg('Kaydedilecek katılımcı yok.'); return }

        setSaving(true); setSaveMsg(null)
        try {
            let clubs: Club[] = []
            try { const { data } = await api.get<Club[]>('clubs/'); if (Array.isArray(data)) clubs = data } catch (e:any) { if (e?.response?.status === 401) setAuthErr(401) }
            const clubIdByName = new Map(clubs.map(c => [c.name.trim().toLowerCase(), c.id]))

            let seedToAthlete: Record<number, number> = {}
            if (!startedRef.current) {
                const sorted = [...players].sort((a, b) => a.seed - b.seed)
                const athletePayload = sorted.map(p => ({
                    first_name: p.name, last_name : 'Example', birth_year: 1453, weight: '-1.00', gender: 'M',
                    club: clubIdByName.get((p.club || '').trim().toLowerCase()) ?? null,
                }))
                const { data: created } = await api.post<Array<{ id: number }>>('athletes/bulk/', athletePayload)
                if (!Array.isArray(created) || created.length !== sorted.length) throw new Error('Athlete bulk sonucu beklenen sayıda değil.')
                created.forEach((a, idx) => { seedToAthlete[sorted[idx].seed] = a.id })
            }

            const roundsForSave: Matrix = (rounds.length ? rounds : propagate(buildMatrix([...players].sort((a,b)=>a.seed-b.seed) as Participant[], settings.placementMap)))

            const getAthleteIdFor = (p?: Player): number | null => {
                if (!p) return null
                if (p.athleteId != null) return p.athleteId
                const s = p.seed || 0
                return s > 0 ? (seedToAthlete[s] ?? null) : null
            }

            const isStarted = startedRef.current
            const matchPayload = roundsForSave.flatMap((round, rIdx) =>
                round.map((m, iIdx) => {
                    const a1 = getAthleteIdFor(m.players[0])
                    const a2 = getAthleteIdFor(m.players[1])
                    const winner = m.players[0]?.winner ? a1 : (m.players[1]?.winner ? a2 : null)
                    const court_no = (() => {
                        const raw = m.meta?.court?.trim(); const n = raw ? parseInt(raw, 10) : NaN; return Number.isFinite(n) ? n : null
                    })()
                    const scheduled_at = timeToISO(m.meta?.time)
                    const row: any = { round_no: rIdx + 1, position: iIdx + 1, court_no, scheduled_at, extra_note: '', sub_tournament: subId, winner: winner ?? null }
                    if (!isStarted) { row.athlete1 = a1; row.athlete2 = a2 }
                    return row
                })
            )

            await api.post('matches/bulk/', matchPayload)

            try {
                if (!started) {
                    const courts = new Set<number>()
                    for (const round of roundsForSave) for (const m of round) { const n = parseInt((m.meta?.court ?? '').toString(), 10); if (Number.isFinite(n)) courts.add(n) }
                    if (tournamentSlug && courts.size) {
                        const hit = async (court: number) => {
                            try {
                                await api.post(`tournaments/${encodeURIComponent(tournamentSlug)}/generate-match-numbers/`, {}, { params: { court } })
                            } catch {
                                try { await api.get(`tournaments/${encodeURIComponent(tournamentSlug)}/generate-match-numbers/`, { params: { court } }) } catch {}
                            }
                        }
                        await Promise.all([...courts].map(c => hit(c)))
                    }
                }
            } catch {}

            setDirty(false)
            setSaveMsg('Kaydedildi.')
            setRefreshKey(k => k + 1) // her seferinde en son kayıt gelsin
        } catch (e:any) {
            if (e?.response?.status === 401) setAuthErr(401)
            setSaveMsg(e instanceof Error ? e.message : 'Kaydetme sırasında hata oluştu.')
        } finally {
            setSaving(false)
            setTimeout(() => setSaveMsg(null), 2500)
        }
    }, [slug, subId, players, rounds, settings.placementMap, started, tournamentSlug])

    useEffect(() => {
        const h = () => { if (!saving) void persistBracket() }
        window.addEventListener('bracket:save', h)
        return () => window.removeEventListener('bracket:save', h)
    }, [persistBracket, saving])

    /* Layout */
    const layout=useMemo<Pos[][]>(()=>rounds.map((round,r)=>{
        const span=BASE<<r
        return round.map((_,i)=>{
            const mid=BASE+span+i*span*2
            return {mid,y1:mid-span/2,y2:mid+span/2}
        })
    }),[rounds])

    const svgHeight = Math.max(((layout[0]?.at(-1)?.mid ?? 0) + BASE), 420)
    const svgWidth  = Math.max((56 + rounds.length*(BOX_W+GAP) + 200), 820)

    const STAGE_PAD = 400
    const stageW = svgWidth  + STAGE_PAD * 2
    const stageH = svgHeight + STAGE_PAD * 2

    const INITIAL_POS = { left: 320, top: 120, scale: 1 }
    const applied = useRef(false)
    useEffect(() => {
        if (!twRef.current || applied.current) return
        const x = -(STAGE_PAD - INITIAL_POS.left)
        const y = -(STAGE_PAD - INITIAL_POS.top)
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 0)
        applied.current = true
    }, [stageW, stageH])

    // Tema arka planı açık mı?
    const isLightBg = useMemo(() => isLightColor(palette.bg), [palette.bg])
    const txtFill   = isLightBg ? '#0f172a' : '#eaf2ff'
    const txtStroke = isLightBg ? 'rgba(255,255,255,.65)' : 'rgba(0,0,0,.55)'

    // ✓ seçimi: manual ayarla ve propagate et
    const setManualWinner = (r:number, m:number, idx:0|1) => {
        setRounds(prev => {
            const copy: Matrix = prev.map(rnd => rnd.map(match => ({
                players: match.players.map(p => ({ ...p })),
                meta: match.meta ? { ...match.meta } : {},
            })))
            copy[r][m].meta = { ...(copy[r][m].meta ?? {}), manual: idx }
            // skor sistemi kullanılmadığı için scores'ı temizliyoruz
            if (copy[r][m].meta?.scores) delete copy[r][m].meta!.scores
            return propagate(copy)
        })
        setDirty(true)
    }

    // Reset: manual & skor temizle, sonra tüm zinciri sıfırla (propagate temizlemesi yapıyor)
    const resetMatch = (r:number, m:number) => {
        setRounds(prev => {
            const copy: Matrix = prev.map(rnd => rnd.map(match => ({
                    players: match.players.map(p => ({ ...p })),
                    meta: match.meta ? { ...match.meta } : {},
                })))
            ;(copy[r][m].meta ??= {})
            delete copy[r][m].meta!.manual
            delete copy[r][m].meta!.scores
            return propagate(copy)
        })
        setDirty(true)
    }

    const resetView = () => {
        if (!twRef.current) return
        const x = -(STAGE_PAD - INITIAL_POS.left)
        const y = -(STAGE_PAD - INITIAL_POS.top)
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 300)
    }

    const isBackend = !!slug
    const pollingEnabled = isBackend && mode === 'view'

    // 401 geldiyse erken çık
    if (authErr === 401) {
        return (
            <div className="relative h-[calc(100vh-64px)] overflow-hidden">
                <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/50">
                    <div className="rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center w-[min(92vw,560px)]">
                        <div className="text-amber-200 font-semibold mb-1">Yetki yok (401)</div>
                        <div className="text-sm text-gray-300 mb-4">Bu içeriği görüntülemek için oturum açmalısınız.</div>
                        <div className="text-xl font-bold mb-2">Bu Sayfa Bulunamadı</div>
                        <div className="flex items-center justify-center gap-3">
                            <a href="/" className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">← Dashboard</a>
                            <a href={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Giriş Yap →</a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-[calc(100vh-64px)] overflow-hidden">
            {isBackend && (
                <BackendBracketLoader
                    slug={slug}
                    enabled={pollingEnabled}
                    refreshKey={refreshKey}
                    onBuilt={handleBuilt}
                    pollMs={30_000}
                    onAuthError={(s)=> s===401 && setAuthErr(401)}
                />
            )}

            {/* Sağ üst durum rozeti */}
            <div className="absolute right-3 top-3 z-[40] select-none pointer-events-none">
                {isFinished ? (
                    <span className="px-2 py-1 rounded text-xs border border-red-600/40 bg-red-600/20 text-red-300">Maç bitti</span>
                ) : started ? (
                    <span className="px-2 py-1 rounded text-xs border border-emerald-600/40 bg-emerald-600/20 text-emerald-300">Maç başladı</span>
                ) : (
                    <span className="px-2 py-1 rounded text-xs border border-yellow-500/40 bg-yellow-500/20 text-yellow-300">Maç düzenleniyor</span>
                )}
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
                    wrapperStyle={{ width: '100%', height: '100%', minHeight: '100%', overflow: 'visible' }}
                    contentStyle={{ overflow: 'visible' }}
                >
                    <div style={{ width: stageW, height: stageH, position: 'relative' }}>
                        {!rounds?.length ? (
                            <div style={{ position:'absolute', left: STAGE_PAD, top: STAGE_PAD }} className="text-white/70 text-sm" />
                        ) : (
                            <svg width={svgWidth} height={svgHeight} style={{ position: 'absolute', left: STAGE_PAD, top: STAGE_PAD }}>
                                <defs>
                                    <style>{`
                    .rect{fill:${palette.bg}}
                    .bar {fill:${palette.bar}}
                    .mid {stroke:${palette.bar};stroke-width:1.4}
                    .ln  {stroke:white;stroke-width:1.4;vector-effect:non-scaling-stroke}
                    .txt {
                      font: 700 17px/1 Inter, ui-sans-serif;
                      fill: ${txtFill};
                      dominant-baseline: middle;
                      paint-order: stroke fill;
                      stroke: ${txtStroke};
                      stroke-width: .8;
                      letter-spacing: .15px;
                    }
                    .win {fill:${palette.win}}
                    .outline{stroke:url(#g);fill:none;stroke-width:0}
                    .hit:hover + .outline{stroke-width:4;filter:drop-shadow(0 0 8px ${palette.glow2})}
                    .done {opacity:.96}
                    .tick {fill:#22c55e}
                    .hl { fill:#fff; stroke:#22d3ee; stroke-width:1.2; paint-order:stroke fill }
                    .mno-bg { fill: rgba(34,197,94,.14); stroke: ${palette.win}; stroke-width:1.6; rx:7 }
                    .mno-txt{ font: 800 12px/1 Inter,ui-sans-serif; fill:#eafff3; letter-spacing:.35px; dominant-baseline:middle;
                              paint-order: stroke fill; stroke: rgba(0,0,0,.45); stroke-width:.6; }
                  `}</style>
                                    <linearGradient id="g" x1="0" x2="1">
                                        <stop offset="0%" stopColor={palette.glow1}/>
                                        <stop offset="100%" stopColor={palette.glow2}/>
                                    </linearGradient>
                                </defs>

                                {rounds.map((round, r) => {
                                    const x0base = 64 + r * (BOX_W + GAP)
                                    const x1 = x0base + BOX_W + GAP
                                    return round.map((m, i) => {
                                        const span = BASE << r
                                        const mid = BASE + span + i * span * 2
                                        const y1 = mid - span / 2
                                        const y2 = mid + span / 2
                                        const finished = m.players.some(p => p.winner != null)
                                        const x0 = x0base

                                        return (
                                            <g key={`${r}-${i}`} className={finished ? 'done' : ''}>
                                                {settings.showMatchNo && typeof m.meta?.matchNo === 'number' && (
                                                    <g transform={`translate(${x0 - 24}, ${mid}) rotate(-90)`}>
                                                        <rect className="mno-bg" x={-18} y={-12} width={36} height={24} rx={7}/>
                                                        <text className="mno-txt" x={0} y={0} textAnchor="middle">{m.meta!.matchNo}</text>
                                                        <title>{`Maç ${m.meta!.matchNo}`}</title>
                                                    </g>
                                                )}

                                                <rect className="rect" x={x0} y={mid - BOX_H / 2} width={BOX_W} height={BOX_H} rx={CORNER}/>
                                                <rect className="bar"  x={x0 - 8} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER}/>
                                                {m.players.some(p => p.winner) && (
                                                    <rect className="win" x={x0 + BOX_W} y={mid - BOX_H / 2} width={8} height={BOX_H} rx={CORNER}/>
                                                )}
                                                <line className="mid" x1={x0} x2={x0 + BOX_W} y1={mid} y2={mid}/>

                                                {m.players.map((p, idx) => {
                                                    const y = mid + (idx ? 22 : -22)
                                                    const isHL = highlight && p?.name?.toLowerCase()?.includes(highlight)
                                                    const clubShort = p.club && p.club.length > 18 ? `${p.club.slice(0, 17)}…` : p.club
                                                    const line = clubShort ? `${p.name} (${clubShort})` : p.name  // ← parantez içinde yanına
                                                    return (
                                                        <g key={idx}>
                                                            <text className={`txt ${isHL ? 'hl' : ''}`} x={x0 + 18} y={y}>
                                                                <tspan>{line}</tspan>
                                                                {p.winner && <tspan className="tick" dx="8">✓</tspan>}
                                                            </text>
                                                        </g>
                                                    )
                                                })}

                                                <line className="ln" x1={x0 - 8} y1={y1} x2={x0 - 8} y2={y2}/>
                                                <line className="ln" x1={x0 - 8} y1={mid} x2={x0} y2={mid}/>
                                                {r < rounds.length - 1 && (
                                                    <line className="ln" x1={x0 + BOX_W + 8} y1={mid} x2={x1 - 8} y2={mid}/>
                                                )}

                                                {/* Tıklanınca büyük ✓ modalı */}
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
                                        )
                                    })
                                })}
                            </svg>
                        )}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {/* Görünümü sıfırla */}
            <button
                onClick={resetView}
                title="Şablonu ilk konuma getir"
                aria-label="Şablonu sıfırla"
                className="fixed bottom-4 right-4 z-[35] w-12 h-12 rounded-full border border-white/25 text-white
                 bg-[#0f1217]/95 hover:bg-[#0f1217] shadow flex items-center justify-center"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
                    <circle cx="12" cy="12" r="2.5"></circle>
                </svg>
            </button>

            {/* ✓ modal (puan yok) */}
            {mode === 'edit' && selected && (
                <WinnerModal
                    open={true}
                    match={rounds[selected.r][selected.m]}
                    onPick={(idx) => setManualWinner(selected.r, selected.m, idx)}
                    onReset={() => resetMatch(selected.r, selected.m)}
                    onClose={() => setSelected(null)}
                />
            )}

            {showExitConfirm && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
                    <div className="bg-[#0f1217] text-white rounded-lg p-4 w-[380px] shadow-xl border border-white/10">
                        <div className="font-semibold text-base mb-2">Yaptığınız değişiklikleri kaydetmek ister misiniz?</div>
                        <div className="text-sm text-white/80 mb-4">Edit modundan çıkılıyor.</div>
                        <div className="flex justify-end gap-2">
                            <button className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15" onClick={() => setShowExitConfirm(false)}>Vazgeç</button>
                            <button className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15" onClick={() => { setShowExitConfirm(false); setMode('view'); setRounds(backendMatrixRef.current); setDirty(false) }}>
                                Kaydetme
                            </button>
                            <button className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => { setShowExitConfirm(false); void persistBracket() }}>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kaydet bildirimi: büyük/yeşil */}
            {saveMsg ? (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90]">
                    <div className="px-5 py-3 rounded-2xl border border-emerald-400/30 bg-emerald-600/25 text-emerald-100 text-lg font-semibold shadow-[0_0_0_2px_rgba(16,185,129,.25),0_8px_22px_rgba(16,185,129,.15)]">
                        {saveMsg}
                    </div>
                </div>
            ) : null}
        </div>
    )
})
