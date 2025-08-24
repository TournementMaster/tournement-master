import {Link, useParams} from 'react-router-dom';
import {useEffect, useMemo, useState} from 'react';
import {api} from '../../lib/api';

/* ────────────────────────────────────────────────────────────────
   Types (API DTOs)
   ──────────────────────────────────────────────────────────────── */
type WeighInDTO = {
    id: number;
    tournament: number;
    date: string;        // "YYYY-MM-DD"
    start_time: string;  // "HH:MM:SS"
    end_time: string;    // "HH:MM:SS"
    public_slug: string;
    is_open: boolean;    // 🆕
};

type AppointmentDTO = {
    id: number;
    user: number;
    is_club: boolean;
    club_name: string | null;
    headcount: number;
    created_at: string;      // ISO
    cancelled_at: string | null;
    weigh_in: number;
    seq_no?: number;         // 🆕
};

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */
function fmtDate(dateISO: string) {
    try {
        const d = new Date(dateISO + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return dateISO;
    }
}

function hhmm(t: string | null | undefined) {
    return (t || '').slice(0, 5);
}

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(' ');
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */
export default function WeighDetailPage() {
    const {tournament_slug} = useParams<{ tournament_slug: string }>();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [weighIn, setWeighIn] = useState<WeighInDTO | null>(null);
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [isManager, setIsManager] = useState(false);          // 🆕 owner/editor mü?
    const [toggling, setToggling] = useState(false);            // 🆕 toggle is_open

    // UI controls
    const [q, setQ] = useState('');                 // kulüp/bireysel filtre
    const [showCancelled, setShowCancelled] = useState(false);
    const [sort, setSort] = useState<'time' | 'name' | 'headcount'>('time');

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setErr(null);
            setNotFound(false);
            setIsManager(false);
            try {
                // 1) Weigh-in detail (by tournament public_slug)
                const wiRes = await api.get<WeighInDTO>(`tournaments/${tournament_slug}/weigh-in/`);
                if (cancelled) return;
                setWeighIn(wiRes.data);

                // 2) Appointments (yalnızca weigh-in varsa)
                try {
                    const apRes = await api.get<AppointmentDTO[]>(`tournaments/${tournament_slug}/weigh-in/appointments/`);
                    if (!cancelled) {
                        setAppointments(Array.isArray(apRes.data) ? apRes.data : []);
                        setIsManager(true); // erişebildiyse manager’dir
                    }
                } catch {
                    if (!cancelled) {
                        setAppointments([]);
                        setIsManager(false);
                    }
                }
            } catch (e: any) {
                if (cancelled) return;
                const status = e?.response?.status;
                if (status === 404) {
                    // Bu turnuva için tartı günü tanımlı değil → boş durum göster
                    setNotFound(true);
                    setWeighIn(null);
                    setAppointments([]);
                } else {
                    setErr('Tartı bilgileri alınamadı.');
                    setWeighIn(null);
                    setAppointments([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [tournament_slug]);

    // Derived
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        const base = appointments
            .filter(a => showCancelled ? true : a.cancelled_at == null)
            .filter(a => {
                const label = a.is_club ? (a.club_name || '') : 'Bireysel';
                return term ? label.toLowerCase().includes(term) : true;
            });

        const arr = [...base];
        arr.sort((a, b) => {
            switch (sort) {
                case 'name': {
                    const an = a.is_club ? (a.club_name || '') : 'Bireysel';
                    const bn = b.is_club ? (b.club_name || '') : 'Bireysel';
                    return an.localeCompare(bn, 'tr');
                }
                case 'headcount':
                    return (b.headcount || 0) - (a.headcount || 0);
                case 'time':
                default:
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
        });
        return arr;
    }, [appointments, q, showCancelled, sort]);

    const stats = useMemo(() => {
        const active = appointments.filter(a => !a.cancelled_at);
        const totalHead = active.reduce((s, a) => s + (Number(a.headcount) || 0), 0);
        const clubCount = active.filter(a => a.is_club).length;
        const individualCount = active.length - clubCount;
        const cancelledCount = appointments.length - active.length;
        return {totalHead, clubCount, individualCount, cancelledCount, activeCount: active.length};
    }, [appointments]);

    async function toggleOpen() {
        if (!weighIn || !isManager) return;
        setToggling(true);
        try {
            const next = !weighIn.is_open;
            const res = await api.patch<WeighInDTO>(`weighins/${encodeURIComponent(weighIn.public_slug)}/`, { is_open: next });
            setWeighIn(res.data);
        } catch {
            // no-op; küçük bir uyarı göstermek isterseniz err state kullanabilirsiniz
        } finally {
            setToggling(false);
        }
    }

    /* ────────────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-8">
                <div className="h-10 w-52 rounded bg-white/10 animate-pulse mb-6"/>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {Array.from({length: 4}).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-white/5 border border-white/10 animate-pulse"/>
                    ))}
                </div>
                <div className="rounded-xl border border-white/10 bg-[#252a32] p-4">
                    <div className="h-8 w-64 bg-white/10 rounded mb-4 animate-pulse"/>
                    {Array.from({length: 6}).map((_, i) => (
                        <div key={i} className="h-12 bg-white/5 rounded mb-2 animate-pulse"/>
                    ))}
                </div>
            </div>
        );
    }

    // 404 → Şık boş-durum kartı
    if (notFound) {
        return (
            <div className="max-w-3xl mx-auto py-12">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1b1f27] to-[#141821] p-8 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-2xl">
                        ⚖️
                    </div>
                    <h1 className="text-xl font-semibold text-white mb-1">Tartı günü bulunmuyor</h1>
                    <p className="text-sm text-gray-400">Bu turnuva için henüz bir tartı günü tanımlanmamış.</p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                        <Link
                            to="/"
                            className="px-3 py-2 rounded-lg bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm"
                        >
                            ← Geri Dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }


    if (err) {
        return (
            <div className="max-w-6xl mx-auto py-8">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="text-red-300 font-semibold mb-1">Hata</div>
                    <div className="text-sm text-red-200">{err}</div>
                </div>
            </div>
        );
    }

    /* ────────────────────────────────────────────────────────────── */
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Tartı Günü</h1>
                    <p className="text-sm text-gray-400">
                        {weighIn
                            ? <>
                                {fmtDate(weighIn.date)} · {hhmm(weighIn.start_time)} – {hhmm(weighIn.end_time)}
                                {isManager && (
                                    <span className={clsx(
                                        'ml-3 inline-flex items-center rounded px-2 py-0.5 text-xs border',
                                        weighIn.is_open
                                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                            : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                    )}>
                                      {weighIn.is_open ? 'Randevu Alımı: Açık' : 'Randevu Alımı: Kapalı'}
                                    </span>
                                )}
                            </>
                            : 'Bu turnuva için tanımlı tartı günü bulunamadı'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isManager && weighIn && (
                        <button
                            onClick={toggleOpen}
                            disabled={toggling}
                            role="switch"
                            aria-checked={weighIn.is_open}
                            className={clsx(
                                'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition',
                                weighIn.is_open
                                    ? 'bg-emerald-600/20 border-emerald-400/30 text-emerald-200 hover:bg-emerald-600/30'
                                    : 'bg-[#1f2229] border-white/10 text-gray-200 hover:border-amber-400/40'
                            )}
                            title="Randevu alımını aç/kapat"
                        >
                            <span className="select-none">{weighIn.is_open ? 'Kapat' : 'Aç'}</span>
                            <span className={clsx(
                                'h-5 w-10 rounded-full p-0.5 transition border',
                                weighIn.is_open ? 'bg-emerald-600/60 border-emerald-400/50' : 'bg-gray-600/40 border-white/20'
                            )}>
                                <span className={clsx(
                                    'block h-4 w-4 rounded-full bg-white transition',
                                    weighIn.is_open ? 'translate-x-5' : 'translate-x-0'
                                )}/>
                            </span>
                        </button>
                    )}
                    {weighIn && (
                        <Link
                            to={`/weigh/${tournament_slug}/book`}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm shadow"
                        >
                            Randevu Al (Paylaşılabilir)
                        </Link>
                    )}
                    <Link to="/" className="text-sm text-blue-300 hover:underline">← Dashboard</Link>
                </div>
            </div>

            {/* Quick stats */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Toplam Randevu"
                    value={stats.activeCount}
                    hint={stats.cancelledCount ? `${stats.cancelledCount} iptal` : undefined}
                />
                <StatCard label="Tahmini Sporcu" value={stats.totalHead}/>
                <StatCard label="Kulüp Randevusu" value={stats.clubCount}/>
                <StatCard label="Bireysel Randevu" value={stats.individualCount}/>
            </section>

            {/* Appointments */}
            <section className="rounded-xl border border-white/10 bg-[#252a32] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="font-semibold text-white">Randevular</div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Kulüp/Bireysel ara…"
                                className="bg-[#1f2229] px-3 py-2 rounded text-sm w-56 placeholder:text-gray-400"
                                aria-label="Randevu ara"
                            />
                            {q && (
                                <button
                                    onClick={() => setQ('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300"
                                    aria-label="Temizle"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={showCancelled}
                                onChange={(e) => setShowCancelled(e.target.checked)}
                            />
                            İptalleri göster
                        </label>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as typeof sort)}
                            className="bg-[#1f2229] px-2 py-2 rounded text-sm"
                        >
                            <option value="time">Sıralama: Kayıt Zamanı</option>
                            <option value="name">Sıralama: İsim (A–Z)</option>
                            <option value="headcount">Sıralama: Sporcu Sayısı</option>
                        </select>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-[#2a2f37] p-8 text-center text-gray-300">
                        Kayıt yok.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filtered.map((a) => {
                            const label = a.is_club ? (a.club_name || 'Kulüp') : 'Bireysel';
                            const cancelled = !!a.cancelled_at;
                            return (
                                <li
                                    key={a.id}
                                    className={clsx(
                                        'group flex items-center justify-between gap-3 rounded-lg px-4 py-3 border',
                                        'bg-[#1f2229] border-white/10 hover:border-emerald-400/30'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            'w-10 h-10 rounded-full flex items-center justify-center select-none text-lg',
                                            cancelled ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'
                                        )}>
                                            ⚖️
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">
                                                {/* 🆕 stabil sıra no */}
                                                {a.seq_no ? <span className="text-gray-300 mr-2">#{a.seq_no}</span> : null}
                                                {label}
                                                {cancelled && <span
                                                    className="ml-2 text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-200 align-middle">İptal</span>}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Kayıt: {new Date(a.created_at).toLocaleString('tr-TR')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium bg-white/10 text-white">
                                            {a.headcount} sporcu
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────
   Small components
   ──────────────────────────────────────────────────────────────── */
function StatCard({label, value, hint}: { label: string; value: number | string; hint?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#252a32] p-4">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-2xl font-semibold text-white mt-1">{value}</div>
            {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
        </div>
    );
}
