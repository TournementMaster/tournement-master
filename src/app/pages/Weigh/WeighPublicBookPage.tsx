import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */
type WeighInDTO = {
    id: number;
    tournament: number;
    date: string;         // "YYYY-MM-DD"
    start_time: string;   // "HH:MM:SS"
    end_time: string;     // "HH:MM:SS"
    public_slug: string;
};

type AppointmentDTO = {
    id: number;
    user: number;              // current user id değil, randevu sahibi (bilgi amaçlı)
    is_club: boolean;
    club_name: string | null;
    headcount: number;
    created_at: string;
    cancelled_at: string | null;
    weigh_in: number;
};

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */
function hhmm(t?: string | null) {
    return (t || '').slice(0, 5);
}
function fmtDate(dateISO: string) {
    try {
        const d = new Date(dateISO + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return dateISO;
    }
}
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(' ');
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */
export default function WeighPublicBookPage() {
    const { tournament_slug } = useParams<{ tournament_slug: string }>();

    const [weighIn, setWeighIn] = useState<WeighInDTO | null>(null);
    const [allMine, setAllMine] = useState<AppointmentDTO[]>([]); // /appointments/ -> user scope (ya da owner/editor ise tümü)
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);

    // Form state
    const [isClub, setIsClub] = useState(true);
    const [clubName, setClubName] = useState('');
    const [headcount, setHeadcount] = useState('1');

    // navigasyon & konum
    const nav = useNavigate();
    const loc = useLocation();
    // 401/403 yakalandığında görsel uyarı + yönlendirme
    const [authRedirecting, setAuthRedirecting] = useState(false);

    function requireLogin(msgText = 'Devam etmek için giriş yapmalısınız.') {
        setMsg({ tone: 'warn', text: msgText });
        setAuthRedirecting(true);
        const next = encodeURIComponent(loc.pathname + loc.search);
        // kısa bir uyarı gösterip login'e at
        setTimeout(() => nav(`/login?next=${next}`), 1200);
    }

    // Durum: owner/editor tespiti (yaklaşık) — owner/editor ise aynı weigh_in için *birden fazla* randevu görülebilir
    const isOwnerOrEditorView = useMemo(() => {
        if (!weighIn) return false;
        const forThis = allMine.filter(a => a.weigh_in === weighIn.id);
        return forThis.length > 1; // owner/editor list görebilir
    }, [allMine, weighIn]);

    // Bu weigh-in için mevcut randevum (normal kullanıcıda 0 veya 1 olur)
    const myAppointment = useMemo(() => {
        if (!weighIn) return null;
        const forThis = allMine.filter(a => a.weigh_in === weighIn.id);
        if (isOwnerOrEditorView) return null; // owner/editor ise kendi randevusunu ayırt edemiyoruz; booking devre dışı.
        return forThis[0] ?? null;
    }, [allMine, weighIn, isOwnerOrEditorView]);

    const myActive = !!(myAppointment && !myAppointment.cancelled_at);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setMsg(null);
            try {
                // 1) Tartı bilgisi (public olabilir)
                const wiRes = await api.get<WeighInDTO>(`tournaments/${tournament_slug}/weigh-in/`);
                if (cancelled) return;
                setWeighIn(wiRes.data || null);

                // 2) Randevular (auth ister)
                try {
                    const apRes = await api.get<AppointmentDTO[]>(`appointments/`);
                    if (cancelled) return;
                    setAllMine(Array.isArray(apRes.data) ? apRes.data : []);
                } catch (e: any) {
                    const code = e?.response?.status;
                    if (code === 401 || code === 403) {
                        if (!cancelled) requireLogin();
                        return;
                    }
                    if (!cancelled) {
                        setAllMine([]);
                        setMsg({ tone: 'err', text: 'Randevular alınamadı.' });
                    }
                }
            } catch {
                if (!cancelled) {
                    setWeighIn(null);
                    setAllMine([]);
                    setMsg({ tone: 'err', text: 'Veri alınamadı. Lütfen daha sonra deneyin.' });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [tournament_slug]);

    // Formu mevcut randevuya göre doldur
    useEffect(() => {
        if (!myAppointment) {
            setIsClub(true);
            setClubName('');
            setHeadcount('1');
            return;
        }
        setIsClub(!!myAppointment.is_club);
        setClubName(myAppointment.club_name || '');
        setHeadcount(String(myAppointment.headcount || 1));
    }, [myAppointment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalHeadcountActive = useMemo(() => {
        // sadece görünür (user scope) kayıtlardan aktif olanları topla; owner/editor'de de bilgi göstermek için filtreleyelim
        return allMine.filter(a => !a.cancelled_at && (!weighIn || a.weigh_in === weighIn.id))
            .reduce((s, a) => s + (Number(a.headcount) || 0), 0);
    }, [allMine, weighIn]);

    async function refreshAppointments() {
        try {
            const apRes = await api.get<AppointmentDTO[]>(`appointments/`);
            setAllMine(Array.isArray(apRes.data) ? apRes.data : []);
        } catch { /* yoksay */ }
    }

    async function onSubmit() {
        if (!weighIn) return;
        setBusy(true);
        setMsg(null);
        try {
            // Validations
            const hc = Math.max(1, Number(headcount) || 1);
            const payload = {
                is_club: isClub,
                club_name: isClub ? (clubName.trim() || null) : null,
                headcount: isClub ? hc : 1, // bireysel -> 1
                weigh_in: weighIn.id,
            };

            if (myActive) {
                // Güncelleme (PATCH /appointments/{id}/)
                await api.patch<AppointmentDTO>(`appointments/${myAppointment!.id}/`, payload);
                setMsg({ tone: 'ok', text: 'Randevunuz güncellendi.' });
            } else {
                // Yalnızca 1 randevu kuralı — client tarafı kontrol
                if (myAppointment && myAppointment.cancelled_at) {
                    // iptal edilmişse yeniden alabilir
                } else if (myAppointment) {
                    setMsg({ tone: 'warn', text: 'Bu turnuva için zaten bir randevunuz var.' });
                    setBusy(false);
                    return;
                }
                // Oluşturma (POST /appointments/)
                await api.post<AppointmentDTO>(`appointments/`, payload);
                setMsg({ tone: 'ok', text: 'Randevunuz oluşturuldu.' });
            }
            await refreshAppointments();
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) {
                requireLogin('Oturum açmanız gerekiyor.');
            } else {
                const detail = e?.response?.data?.detail;
                const txt = typeof detail === 'string'
                    ? detail
                    : 'İşlem başarısız oldu. Turnuvanın sahibi iseniz randevu alamazsınız.';
                setMsg({ tone: 'err', text: txt });
            }
        } finally {
            setBusy(false);
        }
    }

    async function onCancel() {
        if (!myAppointment) return;
        setBusy(true);
        setMsg(null);
        try {
            // İptal (POST /appointments/{id}/cancel/)
            await api.post<AppointmentDTO>(`appointments/${myAppointment.id}/cancel/`, {});
            await refreshAppointments();
            setMsg({ tone: 'ok', text: 'Randevunuz iptal edildi. İsterseniz yeniden alabilirsiniz.' });
        } catch (e: any) {
            const code = e?.response?.status;
            if (code === 401 || code === 403) {
                requireLogin('Oturum açmanız gerekiyor.');
            } else {
                setMsg({ tone: 'err', text: 'Randevu iptal edilemedi.' });
            }
        } finally {
            setBusy(false);
        }
    }

    function copyLink() {
        const url = window.location.href;
        navigator.clipboard?.writeText(url).then(
            () => setMsg({ tone: 'ok', text: 'Bağlantı kopyalandı.' }),
            () => setMsg({ tone: 'warn', text: 'Kopyalanamadı, adres çubuğundan kopyalayın.' })
        );
    }

    /* ────────────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <div className="h-10 w-64 rounded bg-white/10 animate-pulse mb-6" />
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                    ))}
                </div>
                <div className="h-56 rounded-xl bg-[#252a32] border border-white/10 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Tartı Randevusu</h1>
                    <p className="text-sm text-gray-400">
                        {weighIn
                            ? <>
                                {fmtDate(weighIn.date)} · {hhmm(weighIn.start_time)} – {hhmm(weighIn.end_time)}
                            </>
                            : 'Bu turnuvada tartı günü tanımlı değil'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={copyLink} disabled={busy || authRedirecting} className="px-3 py-2 rounded-lg bg-[#1f2229] border border-white/10 hover:border-emerald-400/30 text-sm">
                        Paylaşılabilir Bağlantı
                    </button>
                    <Link to={`/weigh/${tournament_slug}`} className="text-sm text-blue-300 hover:underline">← Detay</Link>
                </div>
            </div>

            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
                <StatCard label="Toplam Sporcu (aktif)" value={totalHeadcountActive} />
                <StatCard label="Durumunuz" value={
                    isOwnerOrEditorView ? 'Organizatör' :
                        myActive ? 'Aktif randevu' :
                            (myAppointment && myAppointment.cancelled_at) ? 'İptal edildi' : 'Randevu yok'
                } />
            </section>

            {/* Owner/Editor uyarısı */}
            {isOwnerOrEditorView && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="text-amber-200 font-medium mb-1">Organizatör görünümü</div>
                    <div className="text-sm text-amber-100/90">Turnuvanın sahibi/düzenleyicisi, bu sayfadan randevu alamaz. Lütfen katılımcılar için bağlantıyı paylaşın.</div>
                </div>
            )}

            {/* Form */}
            <section className="rounded-xl border border-white/10 bg-[#252a32] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">Randevu {myActive ? 'Bilgileriniz' : 'Oluştur'}</div>
                    {myAppointment && (
                        <span className={clsx(
                            'text-xs px-2 py-1 rounded',
                            myActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                                : 'bg-white/10 text-gray-200 border border-white/10'
                        )}>
              {myActive ? `#${myAppointment.id}` : 'İptal edildi'}
            </span>
                    )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Tür seçimi */}
                    <div className="space-y-2">
                        <div className="text-sm text-gray-300">Randevu Türü</div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsClub(true)}
                                className={clsx(
                                    'flex-1 px-3 py-2 rounded-lg border text-sm',
                                    isClub ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1f2229] border-white/10 hover:border-emerald-400/30'
                                )}
                                disabled={myActive && !isClub && !!myAppointment} // no-op
                            >
                                Kulüp
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsClub(false)}
                                className={clsx(
                                    'flex-1 px-3 py-2 rounded-lg border text-sm',
                                    !isClub ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1f2229] border-white/10 hover:border-emerald-400/30'
                                )}
                            >
                                Bireysel
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">Her kullanıcı sadece <b>1</b> randevu alabilir. İptal ettikten sonra yeniden alabilirsiniz.</p>
                    </div>

                    {/* Kulüp adı */}
                    <label className="space-y-2">
                        <div className="text-sm text-gray-300">Kulüp Adı {isClub && <span className="text-red-300">*</span>}</div>
                        <input
                            value={clubName}
                            onChange={(e) => setClubName(e.target.value)}
                            placeholder={isClub ? 'Örn. Yiğit Taekwondo' : 'Bireysel'}
                            disabled={!isClub}
                            className={clsx(
                                'w-full px-3 py-2 rounded-lg bg-[#1f2229] border text-sm',
                                !isClub ? 'border-white/10 text-gray-400' : 'border-white/10 focus:outline-none'
                            )}
                        />
                    </label>

                    {/* Sporcu sayısı */}
                    <label className="space-y-2">
                        <div className="text-sm text-gray-300">Sporcu Sayısı {isClub && <span className="text-red-300">*</span>}</div>
                        <input
                            inputMode="numeric"
                            value={headcount}
                            onChange={(e) => setHeadcount((e.target.value.replace(/\D/g, '') || '1').slice(0, 5))}
                            disabled={!isClub}
                            className={clsx(
                                'w-full px-3 py-2 rounded-lg bg-[#1f2229] border text-sm',
                                !isClub ? 'border-white/10 text-gray-400' : 'border-white/10 focus:outline-none'
                            )}
                        />
                        {!isClub && <div className="text-xs text-gray-400">Bireysel randevular otomatik olarak <b>1</b> kişi kabul edilir.</div>}
                    </label>

                    {/* Zaman bilgisi (salt okunur) */}
                    <div className="space-y-2">
                        <div className="text-sm text-gray-300">Tartı Zamanı</div>
                        <div className="px-3 py-2 rounded-lg bg-[#1f2229] border border-white/10 text-sm text-gray-200">
                            {weighIn ? `${fmtDate(weighIn.date)} · ${hhmm(weighIn.start_time)} – ${hhmm(weighIn.end_time)}` : '—'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSubmit}
                            disabled={busy || !weighIn || isOwnerOrEditorView || (isClub && !clubName.trim()) || authRedirecting}
                            className={clsx(
                                'px-4 py-2 rounded-lg font-medium shadow',
                                busy || isOwnerOrEditorView
                                    ? 'bg-gray-600 text-white/80 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            )}
                        >
                            {myActive ? 'Randevumu Güncelle' : 'Randevu Al'}
                        </button>

                        {myActive && (
                            <button
                                onClick={onCancel}
                                disabled={busy || authRedirecting}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                            >
                                Randevuyu İptal Et
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-gray-400">
                        Turnuva sahibi randevu alamaz. Kurallar sunucu tarafında da kontrol edilir.
                    </div>
                </div>

                {/* Message area */}
                {msg && (
                    <div
                        className={clsx(
                            'mt-3 rounded-lg px-3 py-2 text-sm border',
                            msg.tone === 'ok' && 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
                            msg.tone === 'warn' && 'bg-amber-500/10 text-amber-200 border-amber-400/20',
                            msg.tone === 'err' && 'bg-red-500/10 text-red-200 border-red-400/20',
                        )}
                    >
                        {msg.text}
                    </div>
                )}
            </section>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────
   Small UI
   ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#252a32] p-4">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-2xl font-semibold text-white mt-1">{value}</div>
        </div>
    );
}
