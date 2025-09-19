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

// --- Lightbox etiket formatı (BracketCanvas ile tutarlı) ---
const fixTurkishIDot = (s: string) =>
    (s || '').normalize('NFKC')
        .replace(/\u0049\u0307/g, 'İ')
        .replace(/\u0069\u0307/g, 'i');

const abbreviateGivenNames = (fullName?: string) => {
    const s = fixTurkishIDot((fullName || '').trim().replace(/\s+/g, ' '));
    if (!s) return s;
    const parts = s.split(' ');
    if (parts.length === 1) return s;
    const last = parts[parts.length - 1];
    const given = parts.slice(0, -1).map(w => {
        const lw = w.toLocaleLowerCase('tr');
        if (lw === 'muhammed' || lw === 'muhammet') return 'M.';
        return w;
    });
    return [...given, last].join(' ');
};

const abbreviateClub = (club?: string) => {
    const c = fixTurkishIDot((club || '').trim());
    if (!c) return '';
    return c
        .replace(/\bSpor Kul(ü|u)b(ü|u)\b/gi, 'SK')
        .replace(/\bSpor\b/gi, 'S.')
        .replace(/\bKul(ü|u)b(ü|u)\b/gi, 'Klb.');
};

const formatLabel = (name?: string, club?: string) => {
    const n = abbreviateGivenNames(name);
    const k = abbreviateClub(club);
    return k ? `${n}\u2002(${k})` : (n || '—');
};

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
                            <div className="flex-1 min-w-0">
                                {(() => {
                                    return (
                                        <div className="w-full rounded-md bg-[#1f2229] px-4 py-2 select-none">
                                            <div className="text-white font-medium truncate">{p?.name || '—'}</div>
                                            {p?.club ? (
                                                <div className="mt-0.5 text-xs text-emerald-300/90 font-medium truncate">
                                                    {p.club}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })()}

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
/* -------------------------- Shuffle Countdown Modal -------------------------- */
function ShuffleCountdownModal({
                                   open, count
                               }: { open: boolean; count: number }) {
    if (!open) return null;

    const done = count <= 0;

    return (
        <div className="fixed inset-0 z-[75] bg-black/60 flex items-center justify-center">
            <div className="rounded-2xl bg-[#0f1217] border border-white/10 shadow-2xl px-8 py-10 text-center w-[min(92vw,520px)]">
                {!done ? (
                    <>
                        <div className="text-white/80 text-sm mb-2">Şablon karıştırılıyor…</div>
                        <div className="text-white font-extrabold tracking-wider text-[64px] leading-none">
                            {count}
                        </div>
                    </>
                ) : (
                    <div className="text-emerald-300 font-semibold text-xl">Şablon karıştırıldı ✓</div>
                )}
            </div>
        </div>
    );
}

/* -------------------------------- Component ------------------------------- */
export default memo(function InteractiveBracket() {
    const { players, setPlayers } = usePlayers();
    const { settings, set } = useSettings();
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
    const [courtNo, setCourtNo] = useState<number | null>(null);

    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [canEdit, setCanEdit] = useState<boolean>(Boolean(stateItem?.can_edit ?? false));
    const [refreshKey, setRefreshKey] = useState(0);
    const [authErr, setAuthErr] = useState<number | null>(null);
    const [subDetail, setSubDetail] = useState<SubTournamentDetail | null>(null);

    const [shuffleOpen, setShuffleOpen] = useState(false);
    const [shuffleCount, setShuffleCount] = useState(3);
    const shuffleTimerRef = useRef<number | null>(null);
    const ignoreNextEnterViewRef = useRef<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight || 0 });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);


    const [isReferee, setIsReferee] = useState<boolean>(false);

    type SubTournamentDetail = SubTournament & {
        started?: boolean;
        can_edit?: boolean;
        court_no?: number | null;
        tournament_public_slug?: string | null;
        tournament_slug?: string | null;
        tournament?: any;
        day?: string | null;
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
    const acceptBackendOnceRef = useRef<boolean>(true);

    const [selected, setSelected] = useState<{ r: number; m: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // EKLE: statü label + renk sınıfları
    const statusBadge = useMemo(() => {
        if (isFinished) {
            return { label: 'Maç bitti', cls: 'border-red-600/40 bg-red-600/20 text-red-300' };
        }
        if (started) {
            return { label: 'Maç başladı', cls: 'border-emerald-600/40 bg-emerald-600/20 text-emerald-300' };
        }
        return { label: 'Maç düzenleniyor', cls: 'border-yellow-500/40 bg-yellow-500/20 text-yellow-300' };
    }, [isFinished, started]);


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

    // Rol bilgisini Sidebar'a ilet + globale yaz
    useEffect(() => {
        (window as any).__bracketState = {
            ...(window as any).__bracketState,
            isReferee,
            canEdit,
        };
        window.dispatchEvent(new CustomEvent('bracket:role', { detail: { isReferee, canEdit } }));
    }, [isReferee, canEdit]);

// Başladı mı bilgisini SettingsPanel'e ilet + root attribute + globale yaz
    useEffect(() => {
        document.documentElement.setAttribute('data-bracket-started', started ? '1' : '0');
        (window as any).__bracketState = {
            ...(window as any).__bracketState,
            started,
        };
        window.dispatchEvent(new CustomEvent('bracket:started', { detail: { started } }));
    }, [started]);

    useEffect(() => {
        // yeni brackete geçerken varsayılanları yayınla (gizlemek için)
        setIsReferee(false);
        setCanEdit(false);
        (window as any).__bracketState = {
            ...(window as any).__bracketState,
            isReferee: false,
            canEdit: false,
        };
        window.dispatchEvent(new CustomEvent('bracket:role', { detail: { isReferee: false, canEdit: false } }));
    }, [slug]);

    useEffect(() => {
        const h = () => setStartConfirmOpen(true);
        window.addEventListener('bracket:request-start', h);
        return () => window.removeEventListener('bracket:request-start', h);
    }, []);


    const handleBuilt = useCallback(
        (matrix: Matrix, firstRoundParticipants: Participant[]) => {
            backendMatrixRef.current = matrix;
            const viewMat = startedRef.current ? safePropagate(matrix) : matrix;


            // 1) İlk backend cevabını MOD ne olursa olsun ekrana yaz
            if (acceptBackendOnceRef.current) {
                setRounds(viewMat);
                acceptBackendOnceRef.current = false;

                // Lokal kurulum tetikleyicilerini "backend tabanlı" baseline'a sabitle
                const basePlayers =
                    players.length
                        ? players
                        : firstRoundParticipants.length
                            ? firstRoundParticipants.map((p, i) => ({ ...p, seed: i + 1 }))
                            : [];
                editPlayersSnapshotRef.current = basePlayers.map(p => ({ name: p.name, club: p.club, seed: p.seed }));
                lastPlacementRef.current = settings.placementMap ?? null; // (genelde null)
            } else {
                if (mode === 'view') setRounds(startedRef.current ? propagate(matrix) : matrix);
                else if (!rounds.length) setRounds(startedRef.current ? propagate(matrix) : matrix);
            }

            // 3) players boşsa, backend’den türeyeni yaz (mevcut davranış)
            if (firstRoundParticipants.length && !players.length) {
                const reseeded = firstRoundParticipants.map((p, i) => ({ ...p, seed: i + 1 }));
                setPlayers(reseeded);
            }
        },
        [mode, rounds.length, players.length, setPlayers, settings.placementMap]
    );

    const twRef = useRef<ReactZoomPanPinchRef | null>(null);

    // Hard reset (sadece istemci tarafı güvenli temizleme)
    useEffect(() => {
        const hardReset = () => {
            // Oyuncuları KORU, sadece maç ilerlemelerini/sonuçları sıfırla
            setSelected(null);
            setStarted(false);
            setDirty(true); // kullanıcı isterse “Kaydet” ile backend’e yazar
            // Eşleşmeleri KORU, sadece kazanan/manual/scores bayraklarını temizle ve
// başlamamış gibi propagate et (autoByes: false).
            setRounds(prev => {
                if (!prev.length) return prev;

                const cleared = prev.map(round =>
                    round.map(m => ({
                        players: [
                            m.players[0] ? { ...m.players[0], winner: undefined } : ({} as Player),
                            m.players[1] ? { ...m.players[1], winner: undefined } : ({} as Player),
                        ],
                        meta: (() => {
                            const nm = { ...(m.meta ?? {}) } as any;
                            delete nm.manual;
                            delete nm.scores;
                            return nm;
                        })(),
                    }))
                );

                return propagate(cleared, { autoByes: false });
            });
            // edit-effect'in yeniden buildMatrix çalıştırmasını engelle
            editPlayersSnapshotRef.current = players.map(p => ({
                name: p.name, club: p.club, seed: p.seed,
            }));
            lastPlacementRef.current = settings.placementMap ?? null;
            setSaveMsg('Şablon başlangıç hâline alındı.');
            setTimeout(() => setSaveMsg(null), 1200);

            // ⬇️ EKLE: reset sonrası yetkisi olan kullanıcıyı edit modunda tut
            if (canEdit || isReferee) {
                ignoreNextEnterViewRef.current = true; // bir sonraki enter-view event’ini yut
                setMode('edit');
            }
        };
        window.addEventListener('bracket:hard-reset', hardReset);
        return () => window.removeEventListener('bracket:hard-reset', hardReset);
    }, [players, settings.placementMap, canEdit, isReferee]);


    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('bracket:view-only', { detail: { value: mode === 'view' } })
        );
        document.documentElement.setAttribute('data-bracket-mode', mode);
    }, [mode]);

    // otomatik mod: auth + izin → edit
    const [permReady, setPermReady] = useState<boolean>(Boolean(stateItem?.can_edit !== undefined));
    const autoModeAppliedRef = useRef(false);
    useEffect(() => {
        if (!permReady) return;
        if (!autoModeAppliedRef.current) {
            setMode(isAuth && (canEdit || isReferee) ? 'edit' : 'view');
            autoModeAppliedRef.current = true;
            return;
        }
        // yetki kaybı olursa editten düşür
        if (mode === 'edit' && !(canEdit || isReferee)) {
            setMode('view');
            editPlayersSnapshotRef.current = null;
        }
    }, [permReady, isAuth, canEdit, isReferee, mode]);

    useEffect(() => {
        if ((!(canEdit || isReferee) || !isAuth) && mode === 'edit') {
            setMode('view');
            editPlayersSnapshotRef.current = null;
        }
    }, [isAuth, mode, canEdit, isReferee]);

    useEffect(() => {
        // Sadece DÜZENLEME YETKİSİ OLMAYAN hakemleri kilitle
        const refereeLock = !canEdit && isReferee;
        const participantsViewOnly = (mode === 'view') || startedRef.current || refereeLock;
        window.dispatchEvent(new CustomEvent('bracket:view-only',   { detail: { value: participantsViewOnly } }));
        window.dispatchEvent(new CustomEvent('bracket:players-locked', { detail: { value: startedRef.current || refereeLock } }));
        window.dispatchEvent(new CustomEvent('bracket:sidebar-mode',   { detail: { mode } }));
    }, [mode, started, isReferee, canEdit]);

    // slug → detay çek
    useEffect(() => {
        if (!slug) return;
        (async () => {
            try {
                const { data } = await api.get<SubTournamentDetail>(`subtournaments/${slug}/`);
                if (data?.id) setSubId(data.id);
                setSubDetail(data);
                // court_no
                const cNo = (data as any)?.court_no;
                setCourtNo(typeof cNo === 'number' && Number.isFinite(cNo) ? cNo : null);

                // --- ANA TURNUVA SLUG'INI SAĞLAM AL ---
                let tSlug: string | null = null;

                // 1) API'de doğrudan alan varsa
                if (typeof (data as any)?.tournament_slug === 'string' && (data as any).tournament_slug) {
                    tSlug = (data as any).tournament_slug;
                }
                // 2) Bazı backendler tournament_public_slug döndürebilir
                else if (typeof (data as any)?.tournament_public_slug === 'string' && (data as any).tournament_public_slug) {
                    tSlug = (data as any).tournament_public_slug;
                }
                // 3) Embed turnuva objesi geldiyse
                else if (typeof (data as any)?.tournament?.public_slug === 'string' && (data as any).tournament.public_slug) {
                    tSlug = (data as any).tournament.public_slug;
                }
                // 4) Sadece numeric id geldiyse, public_slug'ı fetch et
                else if (typeof (data as any)?.tournament === 'number') {
                    try {
                        const { data: t } = await api.get<{ public_slug?: string }>(`tournaments/${(data as any).tournament}/`);
                        if (typeof t?.public_slug === 'string' && t.public_slug) tSlug = t.public_slug;
                    } catch { /* yoksay */ }
                }

                setTournamentSlug(tSlug);
                if (typeof data?.can_edit === 'boolean') setCanEdit(Boolean(data.can_edit));
                if (typeof (data as any)?.can_referee === 'boolean') {
                    setIsReferee(Boolean((data as any).can_referee));
                }
                setPermReady(true);

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
    }, [slug]);

    useEffect(() => {
        const nav = (performance.getEntriesByType?.('navigation') as any[]) || [];
        const isReload = !!nav[0] && nav[0].type === 'reload';
        if (isReload) {
            // Local state’i silme; yalnızca snapshot/ref’leri temizle.
            // BackendLoader ilk fetch’i (değişiklik #1) edit modda da yapacağı için ekrana backend matrisi yazılacak.
            editPlayersSnapshotRef.current = null;
            lastPlacementRef.current = null;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    /* Bracket kaynağı seçimi */
    useEffect(() => {
        const placement = settings.placementMap;

        const withByeAdvance = (m: Matrix) => (startedRef.current ? safePropagate(m) : m);


        if (mode === 'edit') {
            if (startedRef.current) {
                const m = backendMatrixRef.current;
                setRounds(m.length ? withByeAdvance(m) : m);
                return;
            }
            if (acceptBackendOnceRef.current) return;

            // Başlamadan önce: BYE auto-advance YAPMA (propagate yok)
            const snap = editPlayersSnapshotRef.current;
            const now = players.map((p) => ({ name: p.name, club: p.club, seed: p.seed }));
            const placementChanged = lastPlacementRef.current !== placement;
            if (!snap || !samePlayersList(snap, now) || placementChanged) {
                const base = players.length ? buildMatrix(players, placement) : [];
                setRounds(base);
                editPlayersSnapshotRef.current = now;
                lastPlacementRef.current = placement;
            }
            return;
        }

        // VIEW
        if (backendMatrixRef.current.length) {
            setRounds(withByeAdvance(backendMatrixRef.current));
        } else if (players.length) {
            const base = buildMatrix(players, placement);
            setRounds(withByeAdvance(base)); // (buildMatrix sağlam ama tutarlılık için aynı sarmalayıcı)
        } else {
            setRounds([]);
        }
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
            if (!(canEdit || isReferee)) return;
            editPlayersSnapshotRef.current = players.map((p) => ({
                name: p.name, club: p.club, seed: p.seed,
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

        // ⬇️ DEĞİŞTİRİLEN KISIM
        const enterView = () => {
            // Hard reset sonrasında gelebilecek tek seferlik enter-view event’ini yut
            if (ignoreNextEnterViewRef.current) {
                ignoreNextEnterViewRef.current = false;
                return;
            }
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
    }, [canEdit, isReferee, mode, dirty, players, settings.placementMap]);

    // "Karıştır" isteği geldiğinde 5-4-3-2-1 geri sayımı yap, bitince karıştırmayı tetikle
    useEffect(() => {
        const onRequestShuffle = () => {
            // varsa eski timer'ı temizle
            if (shuffleTimerRef.current) {
                clearInterval(shuffleTimerRef.current);
                shuffleTimerRef.current = null;
            }
            setShuffleOpen(true);
            setShuffleCount(3);

            let c = 3;
            shuffleTimerRef.current = window.setInterval(() => {
                c -= 1;
                setShuffleCount(c);

                if (c <= 0) {
                    // süre bitti
                    if (shuffleTimerRef.current) {
                        clearInterval(shuffleTimerRef.current);
                        shuffleTimerRef.current = null;
                    }

                    // Asıl karıştırma aksiyonunu ilan et
                    window.dispatchEvent(new CustomEvent('bracket:do-shuffle'));

                    // kısa bir "bitti" bilgisi göster ve modalı kapat
                    setTimeout(() => setShuffleOpen(false), 600);

                    // opsiyonel: ekran altı yeşil tost
                    setSaveMsg('Şablon karıştırıldı.');
                    setTimeout(() => setSaveMsg(null), 1500);
                }
            }, 1000);
        };

        window.addEventListener('bracket:request-shuffle', onRequestShuffle);
        return () => {
            window.removeEventListener('bracket:request-shuffle', onRequestShuffle);
            if (shuffleTimerRef.current) {
                clearInterval(shuffleTimerRef.current);
                shuffleTimerRef.current = null;
            }
        };
    }, [setSaveMsg]);


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

    // BYE/eksik oyuncu durumlarında backend matrisini güvenli hale getirip propagate eden sarmalayıcı
    const safePropagate = (mat: Matrix): Matrix => {
        const norm: Matrix = (mat || []).map((round) =>
            (round || []).map((m) => ({
                players: [
                    (m?.players && m.players[0]) ? { ...m.players[0] } : ({} as Player),
                    (m?.players && m.players[1]) ? { ...m.players[1] } : ({} as Player),
                ],
                meta: m?.meta ? { ...m.meta } : {},
            }))
        );

        try {
            return propagate(norm);
        } catch {
            // propagate içerisinde beklenmedik bir hata olursa en azından uygulamayı düşürmeyelim
            return norm;
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

    // --- MATCH NO senkronizasyonu (generate sonrası local matrise yaz) ---
    const toInt = (v: any): number | null => {
        const n = parseInt(String(v ?? ''), 10);
        return Number.isFinite(n) ? n : null;
    };

    const fetchAndMergeMatchNumbers = async (subIdParam: number) => {
        try {
            const { data } = await api.get<any>('matches/', {
                params: { sub_tournament: subIdParam, page_size: 1000 },
            });
            const items: any[] = Array.isArray(data?.results)
                ? data.results
                : Array.isArray(data)
                    ? data
                    : [];

            if (!items.length) return;

            setRounds((prev) => {
                if (!prev.length) return prev;

                const copy: Matrix = prev.map((rnd) =>
                    rnd.map((match) => ({
                        players: match.players.map((p) => ({ ...p })),
                        meta: match.meta ? { ...match.meta } : {},
                    })),
                );

                for (const it of items) {
                    const r = (toInt(it.round_no) ?? 0) - 1;      // 1-based → 0-based
                    const p = (toInt(it.position) ?? 0) - 1;      // 1-based → 0-based
                    const no =
                        toInt(it.match_no) ??
                        toInt(it.matchNo) ??
                        toInt(it.number) ??
                        toInt(it.no);

                    if (r >= 0 && p >= 0 && no != null && copy[r]?.[p]) {
                        (copy[r][p].meta ??= {});
                        (copy[r][p].meta as any).matchNo = no;
                    }
                }
                return copy;
            });
        } catch {
            /* yoksay – numaralar backend polling ile zaten gelebilir */
        }
    };


    const persistBracket = useCallback(async () => {
        if (!(canEdit || isReferee)) {
            setSaveMsg('Bu turnuvayı düzenleme yetkiniz yok.');
            return;
        }
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
            // 1) Mevcut kulüpleri çek
            let clubs: Club[] = [];
            try {
                const { data } = await api.get<Club[]>('clubs/');
                if (Array.isArray(data)) clubs = data;
            } catch {}

            // 2) Mevcut kulüp haritası
            const clubIdByName = new Map(clubs.map((c) => [c.name.trim().toLowerCase(), c.id]));

            // 3) Oyunculardan ihtiyaç duyulan kulüp isimlerini topla
            const sorted = [...players].sort((a, b) => a.seed - b.seed);
            const originalByLower = new Map<string, string>();
            for (const p of sorted) {
                const raw = (p.club || '').trim();
                if (raw) originalByLower.set(raw.toLowerCase(), raw);
            }
            const neededLowers = [...originalByLower.keys()];
            const missingLowers = neededLowers.filter(n => !clubIdByName.has(n));

            // 4) Eksik kulüpleri idempotent şekilde oluştur
            //    (ClubViewSet.create aynı isim varsa mevcut kaydı 200 ile döndürmeli)
            if (missingLowers.length) {
                for (const lower of missingLowers) {
                    const name = originalByLower.get(lower) || lower; // orijinal büyük-küçük harfi koru
                    try {
                        const { data } = await api.post<Club>('clubs/', { name, city: '' });
                        // dönen isme göre map’i güncelle (backende case/trim düzeltmesi olmuş olabilir)
                        if (data?.id && data?.name) {
                            clubIdByName.set(data.name.trim().toLowerCase(), data.id);
                        }
                    } catch {
                        // Kulüp oluşturulamazsa sporcular o kulüp olmadan yaratılır; burada hatayı yutuyoruz
                        // istersen kullanıcıya küçük bir uyarı gösterebilirsin.
                    }
                }
            }

            // 5) Sporcuları (athletes/bulk) artık kulüp id’leriyle gönder
            let seedToAthlete: Record<number, number> = {};
            if (!startedRef.current) {
                const athletePayload = sorted.map((p) => ({
                    first_name: p.name,
                    last_name: 'Example',
                    birth_year: 1453,
                    weight: '-1.00',
                    gender: 'M',
                    club: (() => {
                        const k = (p.club || '').trim().toLowerCase();
                        return k ? (clubIdByName.get(k) ?? null) : null;
                    })(),
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
                    const metaCourt = (() => {
                        const raw = (m.meta?.court as any)?.toString?.().trim?.();
                        const n = raw ? parseInt(raw, 10) : NaN;
                        return Number.isFinite(n) ? n : null;
                    })();

                    // court_no önceliği: alt turnuva court_no → meta.court → null
                    const court_no_final = (courtNo ?? metaCourt) ?? null;

                    const scheduled_at = timeToISO(m.meta?.time);
                    const row: any = {
                        round_no: rIdx + 1,
                        position: iIdx + 1,
                        court_no: court_no_final,
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
                    const genSlug = tournamentSlug;
                    const genCourt = courtNo;
                    const dayParam = (subDetail as any)?.day || '2025-01-01';

                    if (genSlug && Number.isFinite(genCourt as any) && genCourt !== null) {
                        await api.post(
                            `tournaments/${encodeURIComponent(genSlug)}/generate-match-numbers/`,
                            {},
                            { params: { court: genCourt as number, day: dayParam } }
                        );
                    } else if (genSlug) {
                        const courts = new Set<number>();
                        for (const round of roundsForSave)
                            for (const m of round) {
                                const n = parseInt((m.meta?.court ?? '').toString(), 10);
                                if (Number.isFinite(n)) courts.add(n);
                            }
                        await Promise.all(
                            [...courts].map((c) =>
                                api.post(
                                    `tournaments/${encodeURIComponent(genSlug)}/generate-match-numbers/`,
                                    {},
                                    { params: { court: c, day: dayParam } }
                                ).catch(() => {})
                            )
                        );
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
    }, [
        slug, subId, players, rounds, settings.placementMap, started,
        tournamentSlug, courtNo, canEdit, isReferee,
        subDetail,
    ]);

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


// container'a sığdır
    const fitToContainer = useCallback((instant = false) => {
        if (!twRef.current || !containerRef.current) return;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || 0;
        const sx = (cw - 24) / (svgWidth + 360);
        const sy = ch ? (ch - 24) / (svgHeight + 360) : 1;
        const scale = Math.max(0.35, Math.min(1, Math.min(sx, sy)));
        const left = Math.max(12, (cw - svgWidth * scale) / 2);
        const top  = Math.max(12, (ch - svgHeight * scale) / 2);
        const x = -(STAGE_PAD - left);
        const y = -(STAGE_PAD - top);
        twRef.current.setTransform(x, y, scale, instant ? 0 : 260);
    }, [svgWidth, svgHeight]);

    const INITIAL_POS = { left: 320, top: 120, scale: 1 };
    const fitOnceAppliedRef = useRef(false);
    useEffect(() => {
        if (!twRef.current || fitOnceAppliedRef.current) return;
        if (containerSize.w && containerSize.w < 1024) {
            fitToContainer(true); // dar ekranda sığdır
        } else {
            const x = -(STAGE_PAD - INITIAL_POS.left);
            const y = -(STAGE_PAD - INITIAL_POS.top);
            twRef.current.setTransform(x, y, INITIAL_POS.scale, 0);
        }
        fitOnceAppliedRef.current = true;
    }, [stageW, stageH, containerSize.w, fitToContainer]);



    // Sidebar'ı tamamen kapat/aç (global)
    useEffect(() => {
        const KEY = 'tm.sidebar.collapsed';
        const apply = (collapsed: boolean) => {
            document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
            document.documentElement.classList.toggle('sidebar-open', !collapsed);
        };
        const s = localStorage.getItem(KEY);
        if (s != null) apply(s === '1');

        const onToggle = () => {
            const collapsedNow = !document.documentElement.classList.contains('sidebar-collapsed');
            apply(collapsedNow);
            localStorage.setItem(KEY, collapsedNow ? '1' : '0');
        };
        window.addEventListener('layout:sidebar-toggle', onToggle);
        return () => window.removeEventListener('layout:sidebar-toggle', onToggle);
    }, []);


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
        setRounds(prev => {
            const copy = prev.map(rnd => rnd.map(match => ({
                players: match.players.map(p => ({ ...p })),
                meta: match.meta ? { ...match.meta } : {},
            })));
            copy[r][m].meta = { ...(copy[r][m].meta ?? {}), manual: idx };
            clearUpstream(copy, r, m);
            return propagate(copy, { autoByes: startedRef.current }); // başlamadıysa BYE yok
        });
        setDirty(true);
    };

    // Reset – bağlı üst turları da temizle
    const resetMatch = (r: number, m: number) => {
        setRounds(prev => {
            const copy = prev.map(rnd => rnd.map(match => ({
                players: match.players.map(p => ({ ...p })),
                meta: match.meta ? { ...match.meta } : {},
            })));
            (copy[r][m].meta ??= {});
            delete copy[r][m].meta!.manual;
            delete copy[r][m].meta!.scores;
            clearUpstream(copy, r, m);
            return propagate(copy, { autoByes: startedRef.current }); // başlamadıysa BYE yok
        });
        setDirty(true);
    };

    const resetView = () => {
        if (!twRef.current) return;
        if (containerSize.w && containerSize.w < 1024) {
            fitToContainer(false);
            return;
        }
        const x = -(STAGE_PAD - INITIAL_POS.left);
        const y = -(STAGE_PAD - INITIAL_POS.top);
        twRef.current.setTransform(x, y, INITIAL_POS.scale, 300);
    };

    const isBackend = !!slug;
    const pollingEnabled = isBackend && (mode === 'view' || acceptBackendOnceRef.current);

    // “Şablonu Sıfırla” – DELETE yok; public slug ile SADE payload PATCH et
    useEffect(() => {
        const patchFlagsThenReset = async () => {
            if (!slug) return;

            // Yalnız değişebilir alanları gönder (started / finished).
            // started_at:null, id, tournament, public_slug vb. YOLLAMA.
            const body: Record<string, boolean> = {};
            if (startedRef.current === true) body.started = false;
            if (isFinished === true) body.finished = false;

            if (Object.keys(body).length === 0) return;

            try {
                await api.patch(
                    // ÖNEMLİ: trailing slash var
                    `subtournaments/${encodeURIComponent(slug)}/`,
                    body,
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } catch (err) {
                // Bazı kurulumlarda tek tek göndermek daha sorunsuz olabilir
                try {
                    if (body.started === false) {
                        await api.patch(
                            `subtournaments/${encodeURIComponent(slug)}/`,
                            { started: false },
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    }
                    if (body.finished === false) {
                        await api.patch(
                            `subtournaments/${encodeURIComponent(slug)}/`,
                            { finished: false },
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    }
                } catch (_) { /* yoksay; UI reset zaten client-side effect ile yapılacak */ }
            }
        };

        window.addEventListener('bracket:hard-reset', patchFlagsThenReset);
        return () => window.removeEventListener('bracket:hard-reset', patchFlagsThenReset);
    }, [slug, isFinished]);




    // Başlatma akışı
    const startTournament = useCallback(async () => {
        if (!(canEdit || isReferee)) {
            setSaveMsg('Yetkiniz yok.');
            setTimeout(() => setSaveMsg(null), 1500);
            return;
        }
        if (!slug) return;
        try {
            await api.patch(`subtournaments/${slug}/`, { started: true });
            setStarted(true);
            // BYE’ları başlatma anında üst tura taşı
            setRounds((prev) => (prev.length ? safePropagate(prev) : prev));
            window.dispatchEvent(new CustomEvent('bracket:players-locked', { detail: { value: true } }));
            setSaveMsg('Maç başlatıldı.');
            setTimeout(() => setSaveMsg(null), 1500);
        } catch {
            setSaveMsg('Maç başlatılamadı.');
            setTimeout(() => setSaveMsg(null), 1800);
        }
    }, [slug, canEdit, isReferee]);

    /* ------------------- PRINT: yalnizca başlık + şablon ------------------- */
    const cut = (s = '', n = 28) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

    useEffect(() => {
        const onPrint = (ev: any) => {
            const title = (ev?.detail?.title || '').toString();

            type MatchItem = {
                kind: 'match';
                a: string;
                b: string;
                winner?: 0 | 1 | undefined;
                matchNo?: number;
                round: number; // 1-based
            };

            type LabelItem = {
                kind: 'label';
                round: number; // 1-based
                label: string;
            };

            type FlatItem = MatchItem | LabelItem;

            const totalRounds = rounds.length;

            const roundLabel = (r1: number) => {
                // r1 is 1-based index of the round
                const idxFromEnd = totalRounds - r1; // 0 ⇒ Final, 1 ⇒ Semi, 2 ⇒ Quarter
                if (idxFromEnd === 0) return 'Final';
                if (idxFromEnd === 1) return 'Yarı Final';
                if (idxFromEnd === 2) return 'Çeyrek Final';
                return `${r1}. Tur`;
            };

            // 1) rounds → düz liste (round 0'dan başlayarak) + her turun başına bir etiket kutusu
            const flat: FlatItem[] = [];
            for (let r = 0; r < rounds.length; r++) {
                const r1 = r + 1;

                // Tur etiketi (bu kutu da bir "pmatch" gibi davranır ve sayfa sayımına dahil edilir)
                flat.push({ kind: 'label', round: r1, label: roundLabel(r1) });

                const round = rounds[r];
                for (let i = 0; i < round.length; i++) {
                    const m = round[i];
                    const p1 = m.players[0];
                    const p2 = m.players[1];
                    const aClub = (p1?.club || '').trim();
                    const bClub = (p2?.club || '').trim();
                    const a = (p1?.name || '—') + (aClub ? ` (${cut(aClub, 20)})` : '');
                    const b = (p2?.name || '—') + (bClub ? ` (${cut(bClub, 20)})` : '');
                    let win: 0 | 1 | undefined = undefined;
                    if (p1?.winner === true) win = 0;
                    else if (p2?.winner === true) win = 1;
                    else if (typeof m.meta?.manual === 'number') win = m.meta!.manual as 0 | 1;

                    flat.push({
                        kind: 'match',
                        a,
                        b,
                        winner: win,
                        matchNo: m.meta?.matchNo,
                        round: r1,
                    });
                }
            }

            // 2) Sayfaları 8 kutucuk (etiketler + maçlar) olacak şekilde böl
            const chunkSize = 8;
            const pages: FlatItem[][] = [];
            for (let i = 0; i < flat.length; i += chunkSize) {
                pages.push(flat.slice(i, i + chunkSize));
            }
            if (!pages.length) pages.push([]);

            // 3) print-only root oluştur
            const old = document.getElementById('print-root');
            if (old && old.parentElement) old.parentElement.removeChild(old);

            const root = document.createElement('div');
            root.id = 'print-root';
            // Ekranda göstermiyoruz (print CSS gösterecek)
            root.style.display = 'none';

            // 4) sayfaları doldur
            const mk = (html: string) => {
                const d = document.createElement('div');
                d.innerHTML = html.trim();
                return d.firstElementChild as HTMLElement;
            };

            const titleHtml = (t: string) => `
      <div class="pr-title">${t || ''}</div>
    `;

            pages.forEach((page, pi) => {
                const pageEl = mk(`<section class="print-page"></section>`);

                // Başlık SADECE İLK SAYFADA
                if (pi === 0) {
                    pageEl.appendChild(mk(titleHtml(title)));
                }

                const list = mk(`<div class="print-matches" style="padding-left:16px;"></div>`);
                page.forEach((item, idx) => {
                    if (item.kind === 'label') {
                        // Tur etiketi kutusu (pmatch gibi davranır)
                        const labelBox = mk(`
            <div class="pmatch pmatch--label">
              <div class="plabel" style="width:100%; text-align:center; font-weight:700; font-size:14pt; padding:8px 6px;">
                ${item.label}
              </div>
            </div>
          `);
                        list.appendChild(labelBox);
                    } else {
                        // Normal eşleşme kutusu
                        const num =
                            item.matchNo != null
                                ? String(item.matchNo)
                                : `R${item.round}-${idx + 1 + pi * chunkSize}`;

                        const box = mk(`
            <div class="pmatch">
              <div class="mno" style="min-width:42px;padding:2px 8px;text-align:center;">${num}</div>
              <div class="prow">
                <span class="pidx">1</span>
                <span class="pname">${item.a.replace(/</g, '&lt;')}</span>
                ${item.winner === 0 ? '<span class="ptick">✓</span>' : ''}
              </div>
              <div class="prow">
                <span class="pidx">2</span>
                <span class="pname">${item.b.replace(/</g, '&lt;')}</span>
                ${item.winner === 1 ? '<span class="ptick">✓</span>' : ''}
              </div>
            </div>
          `);
                        list.appendChild(box);
                    }
                });

                pageEl.appendChild(list);
                root.appendChild(pageEl);
            });

            document.body.appendChild(root);

            // 5) Yazdır ve temizlik
            const cleanup = () => {
                const r = document.getElementById('print-root');
                if (r && r.parentElement) r.parentElement.removeChild(r);
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);

            // Layout'un DOM'a yazılmasını bekletip yazdır
            setTimeout(() => window.print(), 30);

            // Güvenlik için 5 sn sonra da temizle
            setTimeout(() => {
                const r = document.getElementById('print-root');
                if (r && r.parentElement) r.parentElement.removeChild(r);
            }, 5000);
        };

        window.addEventListener('bracket:print', onPrint);
        return () => window.removeEventListener('bracket:print', onPrint);
    }, [rounds]);
    return (
        <div ref={containerRef} className="relative h-[calc(100vh-64px)] overflow-hidden">
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


            {isBackend && (
                <BackendBracketLoader
                    slug={slug}
                    enabled={pollingEnabled}
                    refreshKey={refreshKey}
                    onBuilt={handleBuilt}
                    pollMs={15_000}
                    onAuthError={(code) => code === 401 && setAuthErr(401)}
                />
            )}

            <TransformWrapper
                ref={twRef}
                minScale={0.35}
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
                    <div className="bracket-stage" style={{ width: svgWidth + 800, height: svgHeight + 800, position: 'relative' }}>
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


            {/* Header’ın altında sabit statü rozeti (HER ZAMAN görünür) */}
            <div className="fixed right-3 top-[132px] md:top-[84px] z-[0] select-none">
  <span className={`px-2 py-1 rounded text-xs border ${statusBadge.cls}`}>
    {statusBadge.label}
  </span>
            </div>

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
            {/* Karıştır geri sayım modalı */}
            <ShuffleCountdownModal open={shuffleOpen} count={shuffleCount} />

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

            {saving && (
                <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center">
                    <div className="rounded-xl bg-[#1b1f24] border border-white/10 px-6 py-5 text-white flex items-center gap-3 shadow-2xl">
                        <span className="inline-block h-5 w-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                        <span>Kaydediliyor…</span>
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
