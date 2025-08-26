// src/app/pages/Bracket/components/InteractiveBracket/InteractiveBracket.tsx
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    TransformWrapper,
    TransformComponent,
    type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';

import { useBracketTheme, type BracketThemeKey } from '../../../../context/BracketThemeContext';
import { PALETTES, type Palette } from '../../../../context/themePalettes';
import { usePlayers, type Participant } from '../../../../hooks/usePlayers';
import { useSettings } from '../../../../context/BracketSettingsCtx';
import { useAuth } from '../../../../context/useAuth';
import { useLocation } from 'react-router-dom';
import { api } from '../../../../lib/api';
import type { Club } from '../../../../models/Club';
import type { SubTournament } from '../../../../hooks/useSubTournaments';

import BracketCanvas from './BracketCanvas';
import {
    samePlayersList,
    propagate,
    buildMatrix,
    resolveThemeKey,
    BackendBracketLoader,
    type Matrix,
    type Match,
    type Player,
} from './bracketData.ts';

/* ----------------------------- Layout constants -------------------------- */
const BOX_W = 340;
const BOX_H = 78;
const GAP   = 120;
const BASE  = BOX_H;
const CORNER = 10;

type Pos = { mid:number; y1:number; y2:number };

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
    );
}

function WinnerModal({
                         open, match, onPick, onReset, onClose,
                     }: {
    open: boolean;
    match: Match | null;
    onPick: (manualIndex: 0 | 1) => void;
    onReset: () => void;
    onClose: () => void;
}) {
    if (!open || !match) return null;
    const { players, meta } = match;
    const winnerIdx =
        typeof meta?.manual === 'number'
            ? meta!.manual
            : players[0]?.winner
                ? 0
                : players[1]?.winner
                    ? 1
                    : undefined;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
            <div className="w-[560px] max-w-[92vw] rounded-xl bg-[#2b2f36] border border-white/10 shadow-2xl">
                <div className="px-5 py-3 border-b border-white/10 text-white font-semibold tracking-wide">
                    Kazananı Seç
                </div>

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
                        <button type="button" onClick={onReset} className="text-sm text-red-400 hover:text-red-300">
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------- Start Confirm Modal -------------------------- */
function StartConfirmModal({
                               open,
                               onConfirm,
                               onCancel,
                           }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-[#0f1217] text-white rounded-xl p-5 w-[min(92vw,520px)] shadow-2xl border border-white/10">
                <div className="text-lg font-semibold mb-2">Maçı Başlat</div>
                <div className="text-sm text-white/80 mb-4">
                    Maçı başlatmak istediğinize emin misiniz? <b>Bundan sonra sporcu ekleme/çıkarma yapamazsınız.</b>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500"
                    >
                        Maçı Başlat
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- Component ------------------------------- */
export default memo(function InteractiveBracket() {
    const { players, setPlayers } = usePlayers();
    const { settings } = useSettings();
    const themeKey = useBracketTheme();

    // TS7053 fix: PALETTES indeksini güvenli anahtar ile yap
    const palette = useMemo<Palette>(() => {
        const key = resolveThemeKey(themeKey as BracketThemeKey) as keyof typeof PALETTES;
        return PALETTES[key];
    }, [themeKey]);

    const { isAuth } = useAuth();

    const location = useLocation();
    const slug = useMemo(
        () => location.pathname.match(/^\/bracket\/(.+)/)?.[1] ?? '',
        [location.pathname]
    );
    const stateItem =
        ((location.state as (SubTournament & { can_edit?: boolean }) | undefined) || null);
    const [subId, setSubId] = useState<number | null>(stateItem?.id ?? null);
    const [tournamentSlug, setTournamentSlug] = useState<string | null>(null);

    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [canEdit, setCanEdit] = useState<boolean>(Boolean(stateItem?.can_edit ?? true));
    const [refreshKey, setRefreshKey] = useState(0);
    const [authErr, setAuthErr] = useState<number | null>(null);

    type SubTournamentDetail = SubTournament & {
        started?: boolean;
        can_edit?: boolean;
        court_no?: number | null;
        tournament_public_slug?: string | null;
        tournament_slug?: string | null;
        tournament?: any;
    };

    const [started, setStarted] = useState<boolean>(Boolean((stateItem as any)?.started ?? false));
    const startedRef = useRef<boolean>(started);
    useEffect(() => {
        startedRef.current = started;
    }, [started]);

    const [rounds, setRounds] = useState<Matrix>([]);
    const isFinished = useMemo(() => {
        if (!rounds?.length) return false;
        const lastRound = rounds[rounds.length - 1];
        if (!lastRound?.length) return false;
        const finalMatch = lastRound[0];
        return finalMatch?.players?.some((p) => p?.winner != null) ?? false;
    }, [rounds]);
    const backendMatrixRef = useRef<Matrix>([]);

    const [selected, setSelected] = useState<{ r: number; m: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const [startConfirmOpen, setStartConfirmOpen] = useState(false);
    const pendingPickRef = useRef<{ r: number; m: number } | null>(null);

    const editPlayersSnapshotRef = useRef<Participant[] | null>(null);
    const editBaselineRef = useRef<{ playersLen: number } | null>(null);
    const lastPlacementRef = useRef<Record<number, number> | null>(null);

    // highlight (sidebar arama)
    const [highlight, setHighlight] = useState<string>('');
    useEffect(() => {
        const h = (e: any) => setHighlight((e.detail?.name || '').toString().toLowerCase());
        window.addEventListener('bracket:highlight', h);
        return () => window.removeEventListener('bracket:highlight', h);
    }, []);

    const handleBuilt = useCallback(
        (matrix: Matrix, firstRoundParticipants: Participant[]) => {
            backendMatrixRef.current = matrix;
            if (mode === 'view') setRounds(matrix);
            else if (!rounds.length) setRounds(matrix);

            if (firstRoundParticipants.length && !players.length) {
                const reseeded = firstRoundParticipants.map((p, i) => ({ ...p, seed: i + 1 }));
                setPlayers(reseeded);
            }
        },
        [mode, rounds.length, players.length, setPlayers]
    );

    const twRef = useRef<ReactZoomPanPinchRef | null>(null);

    // Hard reset (sadece istemci tarafı güvenli temizleme)
    useEffect(() => {
        const hardReset = () => {
            backendMatrixRef.current = [];
            setRounds([]);
            setSelected(null);
            setDirty(false);
            setPlayers([]);
            setStarted(false);
            editPlayersSnapshotRef.current = null;
            lastPlacementRef.current = null;
            setSaveMsg('Şablon sıfırlandı');
            setTimeout(() => setSaveMsg(null), 1200);
        };
        window.addEventListener('bracket:hard-reset', hardReset);
        return () => window.removeEventListener('bracket:hard-reset', hardReset);
    }, [setPlayers]);

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('bracket:view-only', { detail: { value: mode === 'view' } })
        );
        document.documentElement.setAttribute('data-bracket-mode', mode);
    }, [mode]);

    // otomatik mod: auth + izin → edit
    const autoModeAppliedRef = useRef(false);
    useEffect(() => {
        if (autoModeAppliedRef.current) return;
        setMode(isAuth && canEdit ? 'edit' : 'view');
        autoModeAppliedRef.current = true;
    }, [isAuth, canEdit]);

    useEffect(() => {
        if (!isAuth && mode === 'edit') {
            setMode('view');
            editPlayersSnapshotRef.current = null;
        }
    }, [isAuth, mode]);

    useEffect(() => {
        const participantsViewOnly = mode === 'view' || startedRef.current;
        window.dispatchEvent(
            new CustomEvent('bracket:view-only', { detail: { value: participantsViewOnly } })
        );
        window.dispatchEvent(
            new CustomEvent('bracket:players-locked', { detail: { value: startedRef.current } })
        );
        window.dispatchEvent(new CustomEvent('bracket:sidebar-mode', { detail: { mode } }));
    }, [mode, started]);

    // slug → detay çek
    useEffect(() => {
        if (!slug || subId) return;
        (async () => {
            try {
                const { data } = await api.get<SubTournamentDetail>(`subtournaments/${slug}/`);
                if (data?.id) setSubId(data.id);
                const tSlug =
                    (data as any)?.tournament_public_slug ??
                    (data as any)?.tournament_slug ??
                    (data as any)?.tournament?.public_slug ??
                    null;
                if (typeof tSlug === 'string' && tSlug) setTournamentSlug(tSlug);
                if (typeof data?.can_edit === 'boolean') setCanEdit(Boolean(data.can_edit));
                if (Object.prototype.hasOwnProperty.call(data, 'started')) {
                    setStarted(Boolean(data.started));
                } else if (Object.prototype.hasOwnProperty.call(data as any, 'has_started')) {
                    setStarted(Boolean((data as any).has_started));
                }
            } catch (e: any) {
                const code = e?.response?.status;
                if (code === 401) setAuthErr(401);
                setSaveMsg('Alt turnuva bilgisi alınamadı (slug).');
            }
        })();
    }, [slug, subId]);

    /* Bracket kaynağı seçimi */
    useEffect(() => {
        const placement = settings.placementMap;
        if (mode === 'edit') {
            if (startedRef.current) {
                // Başladıysa artık server kaynağına göre göster
                setRounds(backendMatrixRef.current);
                return;
            }
            // Başlamadan önce: BYE auto-advance YAPMA (propagate yok)
            const snap = editPlayersSnapshotRef.current;
            const now = players.map((p) => ({ name: p.name, club: p.club, seed: p.seed }));
            const placementChanged = lastPlacementRef.current !== placement;
            if (!snap || !samePlayersList(snap, now) || placementChanged) {
                setRounds(players.length ? buildMatrix(players, placement) : []);
                editPlayersSnapshotRef.current = now;
                lastPlacementRef.current = placement;
            }
            return;
        }
        // VIEW: varsa backend, yoksa local propagate
        if (backendMatrixRef.current.length) setRounds(backendMatrixRef.current);
        else if (players.length) setRounds(propagate(buildMatrix(players, placement)));
        else setRounds([]);
    }, [mode, players, settings.placementMap, settings.version, started]);

    useEffect(() => {
        if (mode !== 'edit') return;
        const base = editBaselineRef.current?.playersLen ?? players.length;
        if (players.length !== base) setDirty(true);
    }, [players.length, mode]);
    useEffect(() => {
        if (mode === 'edit' && !startedRef.current) setDirty(true);
    }, [players]);

    /* Header eventleri */
    useEffect(() => {
        const enterEdit = () => {
            if (!canEdit) return;
            editPlayersSnapshotRef.current = players.map((p) => ({
                name: p.name,
                club: p.club,
                seed: p.seed,
            }));
            setMode('edit');
            setRounds(() =>
                backendMatrixRef.current.length
                    ? backendMatrixRef.current
                    : players.length
                        ? buildMatrix(players, settings.placementMap) // başlamadan propagate yok
                        : []
            );
        };
        const enterView = () => {
            if (mode === 'edit' && dirty) setShowExitConfirm(true);
            else {
                setMode('view');
                editPlayersSnapshotRef.current = null;
            }
        };
        const refresh = () => setRefreshKey((k) => k + 1);
        window.addEventListener('bracket:enter-edit', enterEdit);
        window.addEventListener('bracket:enter-view', enterView);
        window.addEventListener('bracket:refresh', refresh);
        return () => {
            window.removeEventListener('bracket:enter-edit', enterEdit);
            window.removeEventListener('bracket:enter-view', enterView);
            window.removeEventListener('bracket:refresh', refresh);
        };
    }, [canEdit, mode, dirty, players, settings.placementMap]);

    /* Yardımcı: üst turlardaki manuel/scores bayraklarını zincir halinde temizle */
    const clearUpstream = (mat: Matrix, r: number, m: number) => {
        let pos = m;
        for (let rr = r + 1; rr < mat.length; rr++) {
            const parentIdx = Math.floor(pos / 2);
            const parent = mat[rr]?.[parentIdx];
            if (parent) {
                parent.meta ??= {};
                delete parent.meta.manual;
                delete parent.meta.scores;
            }
            pos = parentIdx;
        }
    };

    /* Kaydet */
    const timeToISO = (t?: string): string | null => {
        if (!t) return null;
        const s = t.replace('.', ':');
        const m = s.match(/^(\d{2}):(\d{2})$/);
        if (!m) return null;
        const [, hh, mm] = m;
        const now = new Date();
        const local = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            Number(hh),
            Number(mm),
            0,
            0
        );
        return local.toISOString();
    };

    const persistBracket = useCallback(async () => {
        if (!slug) {
            setSaveMsg('Slug okunamadı.');
            return;
        }
        if (!subId) {
            setSaveMsg('Alt turnuva ID bulunamadı.');
            return;
        }
        if (!players.length && !startedRef.current) {
            // boş oyuncu listesiyle server reset’i yalnız FE ile mümkün; erken çık
            setSaveMsg('Kaydedilecek katılımcı yok.');
            return;
        }

        setSaving(true);
        setSaveMsg(null);
        try {
            let clubs: Club[] = [];
            try {
                const { data } = await api.get<Club[]>('clubs/');
                if (Array.isArray(data)) clubs = data;
            } catch {}
            const clubIdByName = new Map(clubs.map((c) => [c.name.trim().toLowerCase(), c.id]));

            let seedToAthlete: Record<number, number> = {};
            if (!startedRef.current) {
                const sorted = [...players].sort((a, b) => a.seed - b.seed);
                const athletePayload = sorted.map((p) => ({
                    first_name: p.name,
                    last_name: 'Example',
                    birth_year: 1453,
                    weight: '-1.00',
                    gender: 'M',
                    club: clubIdByName.get((p.club || '').trim().toLowerCase()) ?? null,
                }));
                const { data: created } = await api.post<Array<{ id: number }>>(
                    'athletes/bulk/',
                    athletePayload
                );
                if (!Array.isArray(created) || created.length !== sorted.length)
                    throw new Error('Athlete bulk sonucu beklenen sayıda değil.');
                created.forEach((a, idx) => {
                    seedToAthlete[sorted[idx].seed] = (a as any).id;
                });
            }

            const roundsForSave: Matrix =
                rounds.length
                    ? rounds
                    : buildMatrix([...players].sort((a, b) => a.seed - b.seed) as Participant[], settings.placementMap);

            const getAthleteIdFor = (p?: Player): number | null => {
                if (!p) return null;
                if ((p as any).athleteId != null) return (p as any).athleteId as number;
                const s = p.seed || 0;
                return s > 0 ? seedToAthlete[s] ?? null : null;
            };

            const isStarted = startedRef.current;
            const matchPayload = roundsForSave.flatMap((round, rIdx) =>
                round.map((m, iIdx) => {
                    const a1 = getAthleteIdFor(m.players[0]);
                    const a2 = getAthleteIdFor(m.players[1]);
                    const winner = m.players[0]?.winner ? a1 : m.players[1]?.winner ? a2 : null;
                    const court_no = (() => {
                        const raw = m.meta?.court?.trim();
                        const n = raw ? parseInt(raw, 10) : NaN;
                        return Number.isFinite(n) ? n : null;
                    })();
                    const scheduled_at = timeToISO(m.meta?.time);
                    const row: any = {
                        round_no: rIdx + 1,
                        position: iIdx + 1,
                        court_no,
                        scheduled_at,
                        extra_note: '',
                        sub_tournament: subId,
                        winner: winner ?? null,
                    };
                    if (!isStarted) {
                        row.athlete1 = a1;
                        row.athlete2 = a2;
                    }
                    return row;
                })
            );

            await api.post('matches/bulk/', matchPayload);

            try {
                if (!started) {
                    const courts = new Set<number>();
                    for (const round of roundsForSave)
                        for (const m of round) {
                            const n = parseInt((m.meta?.court ?? '').toString(), 10);
                            if (Number.isFinite(n)) courts.add(n);
                        }
                    if (tournamentSlug && courts.size) {
                        const hit = async (court: number) => {
                            try {
                                await api.post(
                                    `tournaments/${encodeURIComponent(tournamentSlug)}/generate-match-numbers/`,
                                    {},
                                    { params: { court } }
                                );
                            } catch {
                                try {
                                    await api.get(
                                        `tournaments/${encodeURIComponent(tournamentSlug)}/generate-match-numbers/`,
                                        { params: { court } }
                                    );
                                } catch {}
                            }
                        };
                        await Promise.all([...courts].map((c) => hit(c)));
                    }
                }
            } catch {}

            setDirty(false);
            setSaveMsg('Kaydedildi.');
            setRefreshKey((k) => k + 1);
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401) setAuthErr(401);
            setSaveMsg(e instanceof Error ? e.message : 'Kaydetme sırasında hata oluştu.');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 2400);
        }
    }, [slug, subId, players, rounds, settings.placementMap, started, tournamentSlug]);

    useEffect(() => {
        const h = () => {
            if (!saving) void persistBracket();
        };
        window.addEventListener('bracket:save', h);
        return () => window.removeEventListener('bracket:save', h);
    }, [persistBracket, saving]);

    /* Layout hesapları */
    const layout = useMemo<Pos[][]>(
        () =>
            rounds.map((round, r) => {
                const span = BASE << r;
                return round.map((_, i) => {
                    const mid = BASE + span + i * span * 2;
                    return { mid, y1: mid - span / 2, y2: mid + span / 2 };
                });
            }),
        [rounds]
    );

    const svgHeight = Math.max((layout[0]?.at(-1)?.mid ?? 0) + BASE, 420);
    const svgWidth = Math.max(56 + rounds.length * (BOX_W + GAP) + 200, 820);

    const STAGE_PAD = 400;
    const stageW = svgWidth + STAGE_PAD * 2;
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

    // ✓ seçimi – başlatılmadıysa confirm çıkar
    const onSelectMatch = (r: number, m: number) => {
        if (mode !== 'edit') return;
        if (!startedRef.current) {
            pendingPickRef.current = { r, m };
            setStartConfirmOpen(true);
        } else {
            setSelected({ r, m });
        }
    };

    // ✓ belirleme
    const setManualWinner = (r: number, m: number, idx: 0 | 1) => {
        setRounds((prev) => {
            const copy: Matrix = prev.map((rnd) =>
                rnd.map((match) => ({
                    players: match.players.map((p) => ({ ...p })),
                    meta: match.meta ? { ...match.meta } : {},
                }))
            );
            copy[r][m].meta = { ...(copy[r][m].meta ?? {}), manual: idx };
            // üst turlardaki eski manuel sonuçları temizle
            clearUpstream(copy, r, m);
            return propagate(copy);
        });
        setDirty(true);
    };

    // Reset – bağlı üst turları da temizle
    const resetMatch = (r: number, m: number) => {
        setRounds((prev) => {
            const copy: Matrix = prev.map((rnd) =>
                rnd.map((match) => ({
                    players: match.players.map((p) => ({ ...p })),
                    meta: match.meta ? { ...match.meta } : {},
                }))
            );
            (copy[r][m].meta ??= {});
            delete copy[r][m].meta!.manual;
            delete copy[r][m].meta!.scores;
            clearUpstream(copy, r, m);
            return propagate(copy);
        });
        setDirty(true);
    };

    const resetView = () => {
        if (!twRef.current) return;
        const x = -(STAGE_PAD - INITIAL_POS.left);
        const y = -(STAGE_PAD - INITIAL_POS.top);
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 300);
    };

    const isBackend = !!slug;
    const pollingEnabled = isBackend && mode === 'view';

    // “Şablonu Sıfırla” – backend’de silme uç noktası yok; UI’yi temizliyoruz
    useEffect(() => {
        const hardReset = async () => {
            if (!slug) return;
            setSaveMsg('Şablon temizleniyor…');
            try {
                await api.delete(`subtournaments/${slug}/matches/`);
            } catch {
                try {
                    await api.delete('matches/bulk/', { params: { sub_tournament: subId } });
                } catch {}
            }
            setPlayers([]);
            backendMatrixRef.current = [];
            setRounds([]);
            setDirty(false);
            setSaveMsg('Şablon sıfırlandı');
            setTimeout(() => setSaveMsg(null), 1500);
        };
        window.addEventListener('bracket:hard-reset', hardReset);
        return () => window.removeEventListener('bracket:hard-reset', hardReset);
    }, [slug, subId, setPlayers]);

    // Başlatma akışı
    const startTournament = useCallback(async () => {
        if (!slug) return;
        try {
            await api.patch(`subtournaments/${slug}/`, { started: true });
            setStarted(true);
            // BYE’ları başlatma anında üst tura taşı
            setRounds((prev) => (prev.length ? propagate(prev) : prev));
            window.dispatchEvent(new CustomEvent('bracket:players-locked', { detail: { value: true } }));
            setSaveMsg('Maç başlatıldı.');
            setTimeout(() => setSaveMsg(null), 1500);
        } catch {
            setSaveMsg('Maç başlatılamadı.');
            setTimeout(() => setSaveMsg(null), 1800);
        }
    }, [slug]);

    return (
        <div className="relative h-[calc(100vh-64px)] overflow-hidden">
            {/* 401 overlay */}
            {authErr === 401 ? (
                <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/50">
                    <div className="rounded-2xl border border-white/10 bg-[#1b1f27] p-8 text-center w-[min(92vw,560px)]">
                        <div className="text-amber-200 font-semibold mb-1">Yetki yok (401)</div>
                        <div className="text-sm text-gray-300 mb-4">
                            Bu içeriği görüntülemek için oturum açmalısınız.
                        </div>
                        <div className="text-xl font-bold mb-2">Bu Sayfa Bulunamadı</div>
                        <div className="flex items-center justify-center gap-3">
                            <a
                                href="/"
                                className="px-3 py-2 rounded bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm"
                            >
                                ← Dashboard
                            </a>
                            <a
                                href={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                            >
                                Giriş Yap →
                            </a>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Sağ üst durum rozeti (HER ZAMAN görünür) */}
            <div className="absolute right-3 top-3 z-[40] select-none pointer-events-none">
                {isFinished ? (
                    <span className="px-2 py-1 rounded text-xs border border-red-600/40 bg-red-600/20 text-red-300">
            Maç bitti
          </span>
                ) : started ? (
                    <span className="px-2 py-1 rounded text-xs border border-emerald-600/40 bg-emerald-600/20 text-emerald-300">
            Maç başladı
          </span>
                ) : (
                    <span className="px-2 py-1 rounded text-xs border border-yellow-500/40 bg-yellow-500/20 text-yellow-300">
            Maç düzenleniyor
          </span>
                )}
            </div>

            {isBackend && (
                <BackendBracketLoader
                    slug={slug}
                    enabled={pollingEnabled}
                    refreshKey={refreshKey}
                    onBuilt={handleBuilt}
                    pollMs={30_000}
                    onAuthError={(code) => code === 401 && setAuthErr(401)}
                />
            )}

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
                    <div style={{ width: svgWidth + 800, height: svgHeight + 800, position: 'relative' }}>
                        {!!rounds?.length && (
                            <BracketCanvas
                                rounds={rounds}
                                palette={palette}
                                showMatchNo={settings.showMatchNo}
                                highlight={highlight}
                                mode={mode}
                                onSelect={onSelectMatch}
                                sizes={{ BOX_W, BOX_H, GAP, BASE, CORNER }}
                                svgDims={{ width: Math.max(56 + rounds.length * (BOX_W + GAP) + 200, 820), height: Math.max((layout[0]?.at(-1)?.mid ?? 0) + BASE, 420), left: 400, top: 400 }}
                            />
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

            {/* ✓ modal */}
            {mode === 'edit' && selected && (
                <WinnerModal
                    open={true}
                    match={rounds[selected.r][selected.m]}
                    onPick={(idx) => setManualWinner(selected.r, selected.m, idx)}
                    onReset={() => resetMatch(selected.r, selected.m)}
                    onClose={() => setSelected(null)}
                />
            )}

            {/* Maçı başlat onayı */}
            <StartConfirmModal
                open={startConfirmOpen}
                onCancel={() => {
                    pendingPickRef.current = null;
                    setStartConfirmOpen(false);
                }}
                onConfirm={async () => {
                    setStartConfirmOpen(false);
                    await startTournament();
                    const pick = pendingPickRef.current;
                    pendingPickRef.current = null;
                    if (pick) setSelected(pick);
                }}
            />

            {/* Edit'ten çıkış onayı */}
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
                                    void persistBracket();
                                }}
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kaydedildi / durum tostu */}
            {saveMsg ? (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50]">
                    <div className="px-5 py-3 rounded-xl border border-emerald-500/40 bg-emerald-600/20 text-emerald-100 text-base font-semibold shadow-lg">
                        {saveMsg}
                    </div>
                </div>
            ) : null}
        </div>
    );
});
