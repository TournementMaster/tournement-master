import { useEffect, useRef, useState } from 'react';
import { api } from '../../../../lib/api';
import type { Match } from './bracketData';

function BigTick({
    checked,
    onClick,
    title,
}: {
    checked: boolean;
    onClick: () => void;
    title?: string;
}) {
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

export type WinnerModalProps = {
    open: boolean;
    match: Match | null;
    onPick: (manualIndex: 0 | 1) => void;
    onReset: () => void;
    onVoid: () => void;
    onClose: () => void;
    tournamentSlug: string | null;
    day: string | null;
    onSetMovedMatchNo: (moved: string | null, accepted: boolean) => void;
};

export default function WinnerModal({
    open,
    match,
    onPick,
    onReset,
    onVoid,
    onClose,
    tournamentSlug,
    day,
    onSetMovedMatchNo,
}: WinnerModalProps) {
    const [movedInput, setMovedInput] = useState<string>('');
    const [checkState, setCheckState] = useState<
        'idle' | 'checking' | 'ok' | 'conflict' | 'invalid' | 'error'
    >('idle');
    const [checkMsg, setCheckMsg] = useState<string>('');
    const lastCheckedRef = useRef<string>('');
    const [mnoOpen, setMnoOpen] = useState(false);

    useEffect(() => {
        if (!open || !match) return;
        const hasMoved = !!(match.meta as { movedMatchNo?: string } | undefined)?.movedMatchNo;
        setMnoOpen(!!hasMoved);
    }, [open, match]);

    const normalizeMovedNo = (v: unknown): string | null => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim().replace(',', '.');
        if (!s) return null;
        if (!/^\d+(\.\d{1})?$/.test(s)) return '__INVALID__';
        return s;
    };

    useEffect(() => {
        if (!open || !match) return;
        const cur = (match.meta as { movedMatchNo?: string } | undefined)?.movedMatchNo;
        setMovedInput(cur ? String(cur) : '');
        setCheckState('idle');
        setCheckMsg('');
        lastCheckedRef.current = '';
    }, [open, match?.meta]);

    const checkMovedNo = async (raw: string) => {
        const norm = normalizeMovedNo(raw);

        if (norm === '__INVALID__') {
            setCheckState('invalid');
            setCheckMsg('Geçersiz format. Örn: 405 veya 405.1');
            return { ok: false, norm: null, conflict: true };
        }

        if (norm === null) {
            setCheckState('ok');
            setCheckMsg('Taşınan numara temizlenecek.');
            return { ok: true, norm: null, conflict: false };
        }

        if (!tournamentSlug || !day) {
            setCheckState('error');
            setCheckMsg('Çakışma kontrolü yapılamadı (turnuva/day bilgisi yok).');
            return { ok: true, norm, conflict: false };
        }

        if (lastCheckedRef.current === norm) {
            return { ok: checkState === 'ok', norm, conflict: checkState === 'conflict' };
        }

        setCheckState('checking');
        setCheckMsg('Kontrol ediliyor…');

        try {
            const { data } = await api.get<{
                found?: boolean;
                exists?: boolean;
                match_id?: number;
                match?: { id?: number };
                id?: number;
                sub_tournament_slug?: string;
                sub_tournament_title?: string;
                sub_tournament?: { title?: string };
                title?: string;
                results?: Array<{ sub_tournament?: { title?: string } }>;
            }>(`tournaments/${encodeURIComponent(tournamentSlug)}/find-match/`, {
                params: { day, match_no: norm },
            });

            const found =
                data?.found === true ||
                data?.exists === true ||
                data?.match_id != null ||
                !!data?.sub_tournament_slug ||
                !!data?.match;

            if (!found) {
                setCheckState('ok');
                setCheckMsg('Uygun ✓');
                lastCheckedRef.current = norm;
                return { ok: true, norm, conflict: false };
            }

            const selfId = (match?.meta as { matchId?: number } | undefined)?.matchId ?? null;
            const foundId = data?.match_id ?? data?.match?.id ?? data?.id ?? null;

            if (selfId != null && foundId != null && Number(selfId) === Number(foundId)) {
                setCheckState('ok');
                setCheckMsg('Bu numara zaten bu maçta ✓');
                lastCheckedRef.current = norm;
                return { ok: true, norm, conflict: false };
            }

            const stTitle =
                data?.sub_tournament_title ??
                data?.sub_tournament?.title ??
                data?.title ??
                data?.results?.[0]?.sub_tournament?.title ??
                'başka bir alt turnuva';

            setCheckState('conflict');
            setCheckMsg(`Çakışma: ${day} tarihinde "${stTitle}" içinde zaten var.`);
            lastCheckedRef.current = norm;
            return { ok: false, norm, conflict: true };
        } catch {
            if (import.meta.env.DEV) console.warn('find-match check failed');
            setCheckState('error');
            setCheckMsg('Kontrol sırasında hata oluştu. Yine de kaydedebilirsiniz.');
            return { ok: true, norm, conflict: false };
        }
    };

    if (!open || !match) return null;

    const { players, meta } = match;
    const isVoid = (match.meta as { void?: boolean } | undefined)?.void === true;
    const baseNo = (match.meta as { matchNo?: number } | undefined)?.matchNo;
    const movedNo = (match.meta as { movedMatchNo?: string | null } | undefined)?.movedMatchNo;
    const hasMoved = Boolean(movedNo && String(movedNo).trim());
    const winnerIdx =
        typeof meta?.manual === 'number'
            ? meta.manual
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
                    {([0, 1] as const).map((idx) => {
                        const p = players[idx];
                        return (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="text-white/70 w-6 text-right">
                                    {idx === 0 ? '1' : '2'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="w-full rounded-md bg-[#1f2229] px-4 py-2 select-none">
                                        <div className="text-white font-medium truncate">
                                            {p?.name || '—'}
                                        </div>
                                        {p?.club ? (
                                            <div className="mt-0.5 text-xs text-emerald-300/90 font-medium truncate">
                                                {p.club}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <BigTick
                                    checked={winnerIdx === idx}
                                    title="Kazanan olarak işaretle"
                                    onClick={() => onPick(idx)}
                                />
                            </div>
                        );
                    })}

                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                        <div className="text-white/70 w-6 text-right">Ø</div>
                        <div className="flex-1 min-w-0">
                            <div className="w-full rounded-md bg-[#1f2229] px-4 py-2 select-none">
                                <div className="text-white font-medium truncate">Boş geçti</div>
                                <div className="mt-0.5 text-xs text-white/60 font-medium truncate">
                                    İki sporcu da gelmedi
                                </div>
                            </div>
                        </div>
                        <BigTick
                            checked={isVoid}
                            title="Boş geçti olarak işaretle"
                            onClick={() => onVoid()}
                        />
                    </div>

                    <div className="pt-3 mt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setMnoOpen((v) => !v)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="text-sm font-semibold text-white/90">
                                Maç numarası taşı
                            </div>
                            <div className="flex items-center gap-2">
                                {hasMoved && (
                                    <span className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                        Taşındı{baseNo != null ? `: ${baseNo} → ${String(movedNo).trim()}` : ''}
                                    </span>
                                )}
                                <span className="text-white/60 text-lg leading-none">
                                    {mnoOpen ? '▾' : '▸'}
                                </span>
                            </div>
                        </button>

                        {mnoOpen && (
                            <div className="space-y-2 mt-2">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMovedInput('');
                                            setCheckState('ok');
                                            setCheckMsg('Taşınan maç numarası geri alındı.');
                                            lastCheckedRef.current = '';
                                            onSetMovedMatchNo(null, false);
                                        }}
                                        disabled={!hasMoved && !movedInput.trim()}
                                        className="px-3 h-8 rounded-md bg-red-500/15 border border-red-400/40 text-red-200 text-xs font-semibold hover:bg-red-500/25 disabled:opacity-45 disabled:cursor-not-allowed"
                                        title="Taşınan maç numarasını geri al"
                                    >
                                        Taşınan maç numarasını geri al
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-white/60 min-w-[90px]">
                                        Maç No
                                    </div>
                                    <input
                                        value={movedInput}
                                        onChange={(e) => {
                                            setMovedInput(e.target.value);
                                            setCheckState('idle');
                                            setCheckMsg('');
                                        }}
                                        onBlur={async () => {
                                            const res = await checkMovedNo(movedInput);
                                            if (res.norm === null) {
                                                onSetMovedMatchNo(null, false);
                                                return;
                                            }
                                            if (res.norm && res.ok) {
                                                onSetMovedMatchNo(res.norm, false);
                                            }
                                        }}
                                        placeholder="örn: 405.1"
                                        className="flex-1 h-10 px-3 rounded-md bg-[#1f2229] border border-white/10 text-white/90 font-mono focus:outline-none focus:border-emerald-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const res = await checkMovedNo(movedInput);
                                            if (res.norm === null) {
                                                onSetMovedMatchNo(null, false);
                                                return;
                                            }
                                            if (res.norm && res.ok) {
                                                onSetMovedMatchNo(res.norm, false);
                                            }
                                        }}
                                        className="px-3 h-10 rounded-md bg-[#1f2229] border border-white/10 text-white/80 hover:border-white/30"
                                        title="Bu numaranın aynı gün içinde başka maçta olup olmadığını kontrol et"
                                    >
                                        Kontrol
                                    </button>
                                    {checkState === 'conflict' && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const norm = normalizeMovedNo(movedInput);
                                                if (!norm || norm === '__INVALID__') return;
                                                onSetMovedMatchNo(norm, true);
                                                setCheckState('ok');
                                                setCheckMsg(
                                                    'Çakışma kabul edildi ve maç numarası kaydedildi.'
                                                );
                                            }}
                                            className="px-3 h-10 rounded-md bg-amber-600/80 hover:bg-amber-600 text-white font-semibold"
                                            title="Çakışmayı kabul et ve yine de kullan"
                                        >
                                            Yine de kullan
                                        </button>
                                    )}
                                </div>

                                {checkState !== 'idle' && (
                                    <div
                                        className={`text-xs ${
                                            checkState === 'ok'
                                                ? 'text-emerald-300'
                                                : checkState === 'conflict'
                                                  ? 'text-amber-300'
                                                  : checkState === 'invalid'
                                                    ? 'text-red-300'
                                                    : checkState === 'checking'
                                                      ? 'text-white/70'
                                                      : 'text-white/70'
                                        }`}
                                    >
                                        {checkMsg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
