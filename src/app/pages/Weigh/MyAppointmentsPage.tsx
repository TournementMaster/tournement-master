import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/* ───────── Types ───────── */
type TournamentMini = {
    public_slug?: string;
    title?: string;
    season_year?: number;
};
type AppointmentDTO = {
    id: number;
    user: number;
    is_club: boolean;
    club_name: string | null;
    headcount: number;
    created_at: string;
    cancelled_at: string | null;
    weigh_in: number;
    seq_no?: number;
    appointments_ahead?: number;
    athletes_ahead?: number;
    // OPTIONAL: Backend eklerse doldurulacak
    tournament?: TournamentMini;
};

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(' ');
}
function fmtDateTime(iso: string) {
    try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; }
}
const tName = (t?: TournamentMini) =>
    t?.title ? `${t.title}${t.season_year ? ` (${t.season_year})` : ''}` : 'Diğer';

/* ───────── Page ───────── */
export default function MyAppointmentsPage() {
    const nav = useNavigate();
    const loc = useLocation();

    const [items, setItems] = useState<AppointmentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);

    // Satır bazlı düzenleme state’i
    type EditState = { is_club: boolean; club_name: string; headcount: string };
    const [editRow, setEditRow] = useState<Record<number, EditState>>({}); // key: appointment.id
    const [busyId, setBusyId] = useState<number | null>(null);

    // Filtreler
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
    const [tournamentFilter, setTournamentFilter] = useState<string>('all'); // public_slug | 'all'

    function requireLogin(txt = 'Devam etmek için giriş yapmalısınız.') {
        setMsg({ tone: 'warn', text: txt });
        const next = encodeURIComponent(loc.pathname + loc.search);
        setTimeout(() => nav(`/login?next=${next}`), 1000);
    }

    async function load() {
        setLoading(true);
        setMsg(null);
        try {
            const res = await api.get<AppointmentDTO[]>(`appointments/`);
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) return requireLogin();
            setMsg({ tone: 'err', text: 'Randevular alınamadı.' });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    // Distinct turnuvalar (opsiyonel alanlara göre)
    const tournaments = useMemo(() => {
        const map = new Map<string, { slug: string; label: string }>();
        items.forEach(a => {
            const slug = a.tournament?.public_slug;
            if (slug) map.set(slug, { slug, label: tName(a.tournament) });
        });
        return Array.from(map.values()).sort((x, y) => x.label.localeCompare(y.label, 'tr'));
    }, [items]);

    // Filtrelenmiş & gruplu liste
    const grouped = useMemo(() => {
        const filtered = items.filter(a => {
            const okStatus =
                statusFilter === 'all' ? true :
                    statusFilter === 'active' ? !a.cancelled_at : !!a.cancelled_at;
            const okTournament =
                tournamentFilter === 'all'
                    ? true
                    : a.tournament?.public_slug === tournamentFilter;
            return okStatus && okTournament;
        });

        // turnuva slug -> appointments
        const byT = new Map<string, AppointmentDTO[]>();
        filtered.forEach(a => {
            const slug = a.tournament?.public_slug || '__other__';
            if (!byT.has(slug)) byT.set(slug, []);
            byT.get(slug)!.push(a);
        });

        // sırala: her grupta created_at desc
        const entries = Array.from(byT.entries()).map(([slug, arr]) => {
            const label =
                slug === '__other__' ? 'Diğer' : tName(arr[0]?.tournament);
            const tSlug = slug === '__other__' ? undefined : slug;
            arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { slug: tSlug, label, items: arr };
        });
        // grup başlıklarını alfabetik sırala, "Diğer" en sona
        entries.sort((a, b) => {
            if (!a.slug && b.slug) return 1;
            if (a.slug && !b.slug) return -1;
            return a.label.localeCompare(b.label, 'tr');
        });
        return entries;
    }, [items, statusFilter, tournamentFilter]);

    const activeCount = useMemo(() => items.filter(a => !a.cancelled_at).length, [items]);
    const totalHeadActive = useMemo(
        () => items.filter(a => !a.cancelled_at).reduce((s, a) => s + (Number(a.headcount) || 0), 0),
        [items]
    );

    /* ───── Actions ───── */
    function beginEdit(a: AppointmentDTO) {
        setEditRow(prev => ({
            ...prev,
            [a.id]: {
                is_club: !!a.is_club,
                club_name: a.club_name || '',
                headcount: String(a.headcount || 1),
            }
        }));
    }
    function cancelEdit(a: AppointmentDTO) {
        setEditRow(prev => {
            const next = { ...prev };
            delete next[a.id];
            return next;
        });
    }
    async function saveEdit(a: AppointmentDTO) {
        const state = editRow[a.id];
        if (!state) return;
        // validation: kulüp ise isim zorunlu
        if (state.is_club && !state.club_name.trim()) {
            setMsg({ tone: 'warn', text: 'Kulüp randevusunda “Kulüp Adı” zorunludur.' });
            return;
        }
        const head = Math.max(1, Number(state.headcount.replace(/\D/g, '') || '1'));
        setBusyId(a.id); setMsg(null);
        try {
            const payload = {
                is_club: state.is_club,
                club_name: state.is_club ? (state.club_name.trim() || null) : null,
                headcount: state.is_club ? head : 1,
            };
            const res = await api.patch<AppointmentDTO>(`appointments/${a.id}/`, payload);
            setMsg({
                tone: 'ok',
                text: `Güncellendi. Sıra no: #${res.data.seq_no ?? a.seq_no ?? '—'}. Önünüzde ${res.data.athletes_ahead ?? 0} sporcu var.`,
            });
            await load();
            cancelEdit(a);
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) return requireLogin('Oturum açmanız gerekiyor.');
            const detail = e?.response?.data?.detail;
            setMsg({ tone: 'err', text: typeof detail === 'string' ? detail : 'Güncelleme başarısız.' });
        } finally { setBusyId(null); }
    }

    async function cancelAppointment(a: AppointmentDTO) {
        setBusyId(a.id); setMsg(null);
        try {
            await api.post(`appointments/${a.id}/cancel/`, {});
            setMsg({ tone: 'ok', text: 'Randevunuz iptal edildi.' });
            await load();
            cancelEdit(a);
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) return requireLogin('Oturum açmanız gerekiyor.');
            setMsg({ tone: 'err', text: 'Randevu iptal edilemedi.' });
        } finally { setBusyId(null); }
    }

    async function rebook(a: AppointmentDTO) {
        setBusyId(a.id); setMsg(null);
        try {
            const payload = {
                weigh_in: a.weigh_in,
                is_club: a.is_club,
                club_name: a.is_club ? (a.club_name || null) : null,
                headcount: a.is_club ? Math.max(1, Number(a.headcount) || 1) : 1,
            };
            const res = await api.post<AppointmentDTO>('appointments/', payload);
            setMsg({
                tone: 'ok',
                text: `Randevunuz oluşturuldu. Sıra no: #${res.data.seq_no ?? '—'}. Önünüzde ${res.data.athletes_ahead ?? 0} sporcu var.`,
            });
            await load();
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) return requireLogin('Oturum açmanız gerekiyor.');
            const detail = e?.response?.data?.detail;
            setMsg({ tone: 'err', text: typeof detail === 'string' ? detail : 'Randevu alınamadı.' });
        } finally { setBusyId(null); }
    }

    /* ───── UI ───── */
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="h-8 w-56 rounded bg-white/10 animate-pulse mb-6" />
                <div className="grid sm:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Randevularım</h1>
                    <p className="text-sm text-gray-400">
                        Aktif: <b>{activeCount}</b> · Toplam Sporcu (aktif): <b>{totalHeadActive}</b>
                    </p>
                </div>
                <Link to="/" className="text-sm text-blue-300 hover:underline">← Dashboard</Link>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Durum:</span>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="bg-[#262a33] px-2 py-2 rounded text-sm border border-white/10"
                    >
                        <option value="all">Tümü</option>
                        <option value="active">Aktif</option>
                        <option value="cancelled">İptal</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Turnuva:</span>
                    <select
                        value={tournamentFilter}
                        onChange={e => setTournamentFilter(e.target.value)}
                        className="bg-[#262a33] px-2 py-2 rounded text-sm border border-white/10"
                    >
                        <option value="all">Tümü</option>
                        {tournaments.map(t => (
                            <option key={t.slug} value={t.slug}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Global message */}
            {msg && (
                <div
                    className={clsx(
                        'rounded-lg px-3 py-2 text-sm border',
                        msg.tone === 'ok' && 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
                        msg.tone === 'warn' && 'bg-amber-500/10 text-amber-200 border-amber-400/20',
                        msg.tone === 'err' && 'bg-red-500/10 text-red-200 border-red-400/20',
                    )}
                >
                    {msg.text}
                </div>
            )}

            {/* Groups by tournament */}
            {grouped.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#252a32] p-8 text-center text-gray-300">
                    Kriterlere uyan randevu yok.
                </div>
            ) : (
                grouped.map(group => (
                    <section key={group.slug ?? 'other'} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                {group.label}
                            </h2>
                        </div>

                        <ul className="space-y-3">
                            {group.items.map(a => {
                                const active = !a.cancelled_at;
                                const ed = editRow[a.id];

                                return (
                                    <li
                                        key={a.id}
                                        className={clsx(
                                            'rounded-xl border p-4',
                                            'bg-[#1f2229] border-white/10 hover:border-emerald-400/30'
                                        )}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            {/* Left */}
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={clsx(
                                                        'w-10 h-10 rounded-full flex items-center justify-center text-lg select-none',
                                                        active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                                                    )}
                                                    title="Tartı"
                                                >
                                                    ⚖️
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {a.is_club ? (a.club_name || 'Kulüp') : 'Bireysel'}{' '}
                                                        {active ? (
                                                            <span className="ml-2 align-middle text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
                                Aktif · Sıra: #{a.seq_no ?? '—'}
                              </span>
                                                        ) : (
                                                            <span className="ml-2 align-middle text-xs px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10">
                                İptal edildi
                              </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Kayıt: {fmtDateTime(a.created_at)}
                                                        {active && typeof a.athletes_ahead === 'number' && (
                                                            <span className="ml-2">· Önünüzde <b>{a.athletes_ahead}</b> sporcu var</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right badges */}
                                            <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-sm bg-white/10 text-white">
                          {a.headcount} sporcu
                        </span>
                                            </div>
                                        </div>

                                        {/* Edit block */}
                                        {active ? (
                                            <div className="mt-4 grid sm:grid-cols-2 gap-3">
                                                {/* Tür */}
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-400">Randevu Türü</div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditRow(p => ({ ...p, [a.id]: { ...(p[a.id] ?? {
                                                                        is_club: a.is_club, club_name: a.club_name || '', headcount: String(a.headcount || 1)
                                                                    }), is_club: true } }))}
                                                            className={clsx(
                                                                'flex-1 px-3 py-2 rounded-lg border text-sm',
                                                                (ed ? ed.is_club : a.is_club)
                                                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                                                    : 'bg-[#262a33] border-white/10 hover:border-emerald-400/30'
                                                            )}
                                                        >
                                                            Kulüp
                                                        </button>
                                                        <button
                                                            onClick={() => setEditRow(p => ({ ...p, [a.id]: { ...(p[a.id] ?? {
                                                                        is_club: a.is_club, club_name: a.club_name || '', headcount: String(a.headcount || 1)
                                                                    }), is_club: false } }))}
                                                            className={clsx(
                                                                'flex-1 px-3 py-2 rounded-lg border text-sm',
                                                                !(ed ? ed.is_club : a.is_club)
                                                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                                                    : 'bg-[#262a33] border-white/10 hover:border-emerald-400/30'
                                                            )}
                                                        >
                                                            Bireysel
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400">Değişiklikler hemen kaydedilmez. “Kaydet” ile gönderilir.</p>
                                                </div>

                                                {/* Kulüp adı & sayı (sadece kulüp ise düzenlenebilir) */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <label className="space-y-1">
                                                        <div className="text-xs text-gray-400">Kulüp Adı</div>
                                                        <input
                                                            value={(ed ? ed.club_name : (a.club_name || ''))}
                                                            onChange={(e) => setEditRow(p => ({
                                                                ...p,
                                                                [a.id]: { ...(p[a.id] ?? {
                                                                        is_club: a.is_club, club_name: a.club_name || '', headcount: String(a.headcount || 1)
                                                                    }), club_name: e.target.value }
                                                            }))}
                                                            placeholder={(ed ? ed.is_club : a.is_club) ? 'Kulüp adı' : 'Bireysel'}
                                                            disabled={!(ed ? ed.is_club : a.is_club)}
                                                            className={clsx(
                                                                'w-full px-3 py-2 rounded-lg bg-[#262a33] border text-sm',
                                                                !(ed ? ed.is_club : a.is_club) ? 'border-white/10 text-gray-400' : 'border-white/10'
                                                            )}
                                                        />
                                                    </label>

                                                    <label className="space-y-1">
                                                        <div className="text-xs text-gray-400">Sporcu Sayısı</div>
                                                        <input
                                                            inputMode="numeric"
                                                            value={(ed ? ed.headcount : String(a.headcount || 1))}
                                                            onChange={(e) => {
                                                                const clean = (e.target.value.replace(/\D/g, '') || '1').slice(0, 5);
                                                                setEditRow(p => ({
                                                                    ...p,
                                                                    [a.id]: { ...(p[a.id] ?? {
                                                                            is_club: a.is_club, club_name: a.club_name || '', headcount: String(a.headcount || 1)
                                                                        }), headcount: clean }
                                                                }));
                                                            }}
                                                            disabled={!(ed ? ed.is_club : a.is_club)}
                                                            className={clsx(
                                                                'w-full px-3 py-2 rounded-lg bg-[#262a33] border text-sm',
                                                                !(ed ? ed.is_club : a.is_club) ? 'border-white/10 text-gray-400' : 'border-white/10'
                                                            )}
                                                        />
                                                    </label>
                                                </div>

                                                {/* Kaydet/Vazgeç & İptal */}
                                                <div className="sm:col-span-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => saveEdit(a)}
                                                            disabled={
                                                                busyId === a.id ||
                                                                !!(editRow[a.id]?.is_club && !editRow[a.id]?.club_name.trim())
                                                            }
                                                            className={clsx(
                                                                'px-3 py-2 rounded-lg text-sm font-medium',
                                                                (busyId === a.id) ? 'bg-gray-600 text-white/80 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                            )}
                                                        >
                                                            Kaydet
                                                        </button>
                                                        <button
                                                            onClick={() => cancelEdit(a)}
                                                            disabled={busyId === a.id || !editRow[a.id]}
                                                            className="px-3 py-2 rounded-lg text-sm bg-[#2b2f38] border border-white/10 hover:border-emerald-400/30"
                                                        >
                                                            Vazgeç
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => cancelAppointment(a)}
                                                        disabled={busyId === a.id}
                                                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                                                    >
                                                        İptal Et
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // İptal edilmiş ise yalnızca Yeniden Al
                                            <div className="mt-4 flex items-center justify-end">
                                                <button
                                                    onClick={() => rebook(a)}
                                                    disabled={busyId === a.id}
                                                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                                                >
                                                    Yeniden Al
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))
            )}
        </div>
    );
}
