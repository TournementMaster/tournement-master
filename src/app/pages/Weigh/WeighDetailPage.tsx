// src/app/pages/Weigh/WeighDetailPage.tsx
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

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
    is_open: boolean;
};

// 🔁 Aynı endpoint, yeni alanlar
type AppointmentDTO = {
    id: number;
    weigh_in: number;
    is_club: boolean;
    club_name: string | null;
    headcount: number;
    created_at: string;
    cancelled_at: string | null;
    seq_no?: number;

    // 🆕 yeni sistem alanları
    gender: 'M' | 'F';
    phone: string;
    first_name: string;
    last_name: string;

    // (opsiyonel) kuyruğa dair özetler gelebilir
    appointments_ahead?: number;
    athletes_ahead?: number;
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
function hhmm(t?: string | null) {
    return (t || '').slice(0, 5);
}
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(' ');
}
const genderLabel = (g: 'M' | 'F') => (g === 'M' ? 'Erkek' : 'Kadın');

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */
export default function WeighDetailPage() {
    const { tournament_slug } = useParams<{ tournament_slug: string }>();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [weighIn, setWeighIn] = useState<WeighInDTO | null>(null);
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [isManager, setIsManager] = useState(false);
    const [toggling, setToggling] = useState(false);

    // Filters / sort
    const [q, setQ] = useState('');
    const [showCancelled, setShowCancelled] = useState(false);
    const [sort, setSort] = useState<'time' | 'name' | 'headcount' | 'gender'>('time');
    const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setErr(null);
            setNotFound(false);
            setIsManager(false);
            try {
                // 1) Weigh-in (slug ile)
                const wiRes = await api.get<WeighInDTO>(`tournaments/${tournament_slug}/weigh-in/`);
                if (cancelled) return;
                setWeighIn(wiRes.data);

                // 2) Appointments (owner/editor ise tümü gelir; değilse 403)
                try {
                    const apRes = await api.get<AppointmentDTO[]>(`tournaments/${tournament_slug}/weigh-in/appointments/`);
                    if (!cancelled) {
                        setAppointments(Array.isArray(apRes.data) ? apRes.data : []);
                        setIsManager(true);
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

    // Derived / stats
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        const base = appointments
            .filter((a) => (showCancelled ? true : a.cancelled_at == null))
            .filter((a) => (genderFilter === 'ALL' ? true : a.gender === genderFilter))
            .filter((a) => {
                // arama: kulüp adı + bireysel + ad soyad + telefon
                const who = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                const label = a.is_club ? (a.club_name || '') : 'Bireysel';
                const phone = a.phone || '';
                const text = `${label} ${who} ${phone}`.toLowerCase();
                return term ? text.includes(term) : true;
            });

        const arr = [...base];
        arr.sort((a, b) => {
            switch (sort) {
                case 'name': {
                    const an = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                    const bn = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                    return an.localeCompare(bn, 'tr');
                }
                case 'headcount':
                    return (b.headcount || 0) - (a.headcount || 0);
                case 'gender':
                    return (a.gender > b.gender ? 1 : a.gender < b.gender ? -1 : 0) || (a.seq_no || 0) - (b.seq_no || 0);
                case 'time':
                default:
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
        });
        return arr;
    }, [appointments, q, showCancelled, sort, genderFilter]);

    const stats = useMemo(() => {
        const actives = appointments.filter((a) => !a.cancelled_at);
        const totalHead = actives.reduce((s, a) => s + (Number(a.headcount) || 0), 0);
        const clubCount = actives.filter((a) => a.is_club).length;
        const individualCount = actives.length - clubCount;
        const cancelledCount = appointments.length - actives.length;

        const maleAct = actives.filter((a) => a.gender === 'M');
        const femaleAct = actives.filter((a) => a.gender === 'F');
        const maleHead = maleAct.reduce((s, a) => s + (a.headcount || 0), 0);
        const femaleHead = femaleAct.reduce((s, a) => s + (a.headcount || 0), 0);

        return {
            totalHead,
            clubCount,
            individualCount,
            cancelledCount,
            activeCount: actives.length,
            maleCount: maleAct.length,
            femaleCount: femaleAct.length,
            maleHead,
            femaleHead,
        };
    }, [appointments]);

    async function toggleOpen() {
        if (!weighIn || !isManager) return;
        setToggling(true);
        try {
            const next = !weighIn.is_open;
            const res = await api.patch<WeighInDTO>(`weighins/${encodeURIComponent(weighIn.public_slug)}/`, { is_open: next });
            setWeighIn(res.data);
        } catch {
            // no-op
        } finally {
            setToggling(false);
        }
    }

    /* ────────────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-8">
                <div className="h-10 w-52 rounded bg-white/10 animate-pulse mb-6" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                    ))}
                </div>
                <div className="rounded-xl border border-white/10 bg-[#252a32] p-4">
                    <div className="h-8 w-64 bg-white/10 rounded mb-4 animate-pulse" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 bg-white/5 rounded mb-2 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

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
                        <Link to="/" className="px-3 py-2 rounded-lg bg-[#2b2f38] hover:bg-[#333845] border border-white/10 text-sm">
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
                        {weighIn ? (
                            <>
                                {fmtDate(weighIn.date)} · {hhmm(weighIn.start_time)} – {hhmm(weighIn.end_time)}
                                {isManager && (
                                    <span
                                        className={clsx(
                                            'ml-3 inline-flex items-center rounded px-2 py-0.5 text-xs border',
                                            weighIn.is_open
                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                                : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                        )}
                                    >
                    {weighIn.is_open ? 'Randevu Alımı: Açık' : 'Randevu Alımı: Kapalı'}
                  </span>
                                )}
                            </>
                        ) : (
                            'Bu turnuva için tanımlı tartı günü bulunamadı'
                        )}
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
                            <span
                                className={clsx(
                                    'h-5 w-10 rounded-full p-0.5 transition border',
                                    weighIn.is_open ? 'bg-emerald-600/60 border-emerald-400/50' : 'bg-gray-600/40 border-white/20'
                                )}
                            >
                <span
                    className={clsx(
                        'block h-4 w-4 rounded-full bg-white transition',
                        weighIn.is_open ? 'translate-x-5' : 'translate-x-0'
                    )}
                />
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
                    <Link to="/" className="text-sm text-blue-300 hover:underline">
                        ← Dashboard
                    </Link>
                </div>
            </div>

            {/* Quick stats */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard label="Toplam Randevu" value={stats.activeCount} hint={stats.cancelledCount ? `${stats.cancelledCount} iptal` : undefined} />
                <StatCard label="Tahmini Sporcu" value={stats.totalHead} />
                <StatCard label="Kulüp" value={stats.clubCount} />
                <StatCard label="Bireysel" value={stats.individualCount} />
                <StatCard label="Erkek (adet/kişi)" value={`${stats.maleCount} / ${stats.maleHead}`} />
                <StatCard label="Kadın (adet/kişi)" value={`${stats.femaleCount} / ${stats.femaleHead}`} />
            </section>

            {/* Appointments */}
            <section className="rounded-xl border border-white/10 bg-[#252a32] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="font-semibold text-white">Randevular</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Kulüp, kişi veya telefon ara…"
                                className="bg-[#1f2229] px-3 py-2 rounded text-sm w-64 placeholder:text-gray-400"
                                aria-label="Randevu ara"
                            />
                            {q && (
                                <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300" aria-label="Temizle">
                                    ✕
                                </button>
                            )}
                        </div>

                        <select
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value as 'ALL' | 'M' | 'F')}
                            className="bg-[#1f2229] px-2 py-2 rounded text-sm"
                            aria-label="Cinsiyet filtresi"
                        >
                            <option value="ALL">Cinsiyet: Tümü</option>
                            <option value="M">Cinsiyet: Erkek</option>
                            <option value="F">Cinsiyet: Kadın</option>
                        </select>

                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
                            İptalleri göster
                        </label>

                        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-[#1f2229] px-2 py-2 rounded text-sm">
                            <option value="time">Sıralama: Kayıt Zamanı</option>
                            <option value="name">Sıralama: İsim (A–Z)</option>
                            <option value="headcount">Sıralama: Sporcu Sayısı</option>
                            <option value="gender">Sıralama: Cinsiyet → Sıra No</option>
                        </select>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-[#2a2f37] p-8 text-center text-gray-300">Kayıt yok.</div>
                ) : (
                    <ul className="space-y-2">
                        {filtered.map((a) => {
                            const cancelled = !!a.cancelled_at;
                            const who = `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Ad Soyad Yok';
                            const label = a.is_club ? (a.club_name || 'Kulüp') : 'Bireysel';
                            const g = a.gender;

                            return (
                                <li
                                    key={a.id}
                                    className={clsx(
                                        'group rounded-lg px-4 py-3 border bg-[#1f2229] border-white/10 hover:border-emerald-400/30',
                                        cancelled && 'opacity-75'
                                    )}
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        {/* Left block: identity & meta */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={clsx(
                                                    'w-10 h-10 rounded-full flex items-center justify-center select-none text-base',
                                                    cancelled
                                                        ? 'bg-red-500/15 text-red-300'
                                                        : g === 'M'
                                                            ? 'bg-sky-500/15 text-sky-300'
                                                            : 'bg-pink-500/15 text-pink-300'
                                                )}
                                                title={genderLabel(g)}
                                            >
                                                {g === 'M' ? '♂' : '♀'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">
                                                    {/* sıra no */}
                                                    {a.seq_no ? <span className="text-gray-300 mr-2">#{a.seq_no}</span> : null}
                                                    {label}
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className="text-gray-200">{who}</span>
                                                    {cancelled && (
                                                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-200 align-middle">İptal</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Tel: <span className="font-mono">{a.phone || '—'}</span>
                                                    <span className="mx-2">•</span>
                                                    Kayıt: {new Date(a.created_at).toLocaleString('tr-TR')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right block: chips */}
                                        <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium bg-white/10 text-white">
                        {a.headcount} sporcu
                      </span>
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center px-2.5 py-1 rounded text-sm font-medium',
                                                    g === 'M' ? 'bg-sky-500/15 text-sky-200' : 'bg-pink-500/15 text-pink-200'
                                                )}
                                            >
                        {genderLabel(g)}
                      </span>
                                        </div>
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
function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#252a32] p-4">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-2xl font-semibold text-white mt-1">{value}</div>
            {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
        </div>
    );
}
