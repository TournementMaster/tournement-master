// src/app/pages/Weigh/WeighPublicBookPage.tsx
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */
type WeighInDTO = {
    id: number;
    tournament: number;
    date: string;
    start_time: string;
    end_time: string;
    public_slug: string;
    is_open: boolean;
};

type AppointmentDTO = {
    id: number;
    weigh_in: number;
    is_club: boolean;
    club_name: string | null;
    headcount: number;
    gender: 'M' | 'F';
    phone: string;
    first_name: string;
    last_name: string;
    created_at: string;
    cancelled_at: string | null;
    seq_no?: number;
    appointments_ahead?: number;
    athletes_ahead?: number;
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
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(' ');
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */
export default function WeighPublicBookPage() {
    const { tournament_slug } = useParams<{ tournament_slug: string }>();

    // data
    const [weighIn, setWeighIn] = useState<WeighInDTO | null>(null);
    const [mine, setMine] = useState<AppointmentDTO[]>([]);

    // ui state
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [phase, setPhase] = useState<'identify' | 'manage'>('identify'); // önce kimlik, sonra yönetim
    const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);
    const [mismatchWarn, setMismatchWarn] = useState<string | null>(null);

    // identity
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // booking form
    const [isClub, setIsClub] = useState(true);
    const [clubName, setClubName] = useState('');
    const [maleChecked, setMaleChecked] = useState(true);
    const [femaleChecked, setFemaleChecked] = useState(false);
    const [maleCount, setMaleCount] = useState('1');
    const [femaleCount, setFemaleCount] = useState('1');

    // modal (lightbox) for SMS code / notices
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'cancel' | 'notice'>('create');
    const [noticeText, setNoticeText] = useState<string | null>(null);
    const [pendingCreate, setPendingCreate] = useState<Array<{ gender: 'M' | 'F'; headcount: number }>>([]);
    const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
    const [smsCode, setSmsCode] = useState('');
    const [smsErr, setSmsErr] = useState<string | null>(null);
    const hiddenCodeInputRef = useRef<HTMLInputElement>(null);

    // load weigh-in
    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setMsg(null);
            setMismatchWarn(null);
            try {
                const wiRes = await api.get<WeighInDTO>(`tournaments/${tournament_slug}/weigh-in/`);
                if (cancelled) return;
                setWeighIn(wiRes.data || null);
            } catch {
                if (!cancelled) {
                    setWeighIn(null);
                    setMsg({ tone: 'err', text: 'Veri alınamadı. Lütfen daha sonra deneyin.' });
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

    // derived
    const activeMine = useMemo(() => mine.filter((a) => !a.cancelled_at), [mine]);
    const cancelledMine = useMemo(() => mine.filter((a) => !!a.cancelled_at), [mine]);
    const bookingClosed = !!(weighIn && !weighIn.is_open);

    // identity checks
    const phoneOk = phone.trim().length > 0;
    const idOk = phoneOk && !!firstName.trim() && !!lastName.trim();

    /* ────────────────────────────────────────────────────────────────
       Identity → Lookup flow
       ──────────────────────────────────────────────────────────────── */
    async function onLookup() {
        if (!weighIn || !idOk) return;
        setBusy(true);
        setMsg(null);
        setMismatchWarn(null);
        try {
            // 1) Ad-soyad ile randevuları getir
            const qs = new URLSearchParams({
                weigh_in: String(weighIn.id),
                phone,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            }).toString();
            const res = await api.get<AppointmentDTO[]>(`appointments/lookup?${qs}`);
            setMine(Array.isArray(res.data) ? res.data : []);
            setPhase('manage');
            if (res.data?.length === 0) {
                setMsg({ tone: 'ok', text: 'Kayıtlı randevunuz bulunamadı. Yeni randevu oluşturabilirsiniz.' });
            }
        } catch (e: any) {
            // 2) Ad-soyad uyuşmadıysa telefonu doğrulayıp kullanıcıyı bilgilendir
            try {
                const probe = await api.get<{ exists: boolean }>(
                    `appointments/exists-by-phone?weigh_in=${weighIn.id}&phone=${encodeURIComponent(phone)}`
                );
                if (probe?.data?.exists) {
                    setMismatchWarn('Telefon numarası bulundu ancak ad/soyad eşleşmiyor. Lütfen bilgilerinizi kontrol edin.');
                } else {
                    setMine([]);
                    setPhase('manage');
                    setMsg({ tone: 'ok', text: 'Bu telefon için kayıt bulunamadı. Yeni randevu oluşturabilirsiniz.' });
                }
            } catch {
                setMine([]);
                setPhase('manage');
                setMsg({ tone: 'ok', text: 'Randevu bilgisi bulunamadı. Yeni randevu oluşturabilirsiniz.' });
            }
        } finally {
            setBusy(false);
        }
    }

    /* ────────────────────────────────────────────────────────────────
       Refresh helper
       ──────────────────────────────────────────────────────────────── */
    async function refreshMine() {
        if (!weighIn || !idOk) return;
        try {
            const qs = new URLSearchParams({
                weigh_in: String(weighIn.id),
                phone,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            }).toString();
            const res = await api.get<AppointmentDTO[]>(`appointments/lookup?${qs}`);
            setMine(Array.isArray(res.data) ? res.data : []);
        } catch {
            /* yoksay */
        }
    }

    /* ────────────────────────────────────────────────────────────────
       Booking validations
       ──────────────────────────────────────────────────────────────── */
    const atLeastOneGender = maleChecked || femaleChecked;
    const exactlyOneGenderForIndividual = !isClub ? Number(maleChecked) + Number(femaleChecked) === 1 : true;
    const clubOk = isClub ? clubName.trim().length > 0 : true;
    const headcountsOk =
        !isClub || ((maleChecked ? Number(maleCount) > 0 : true) && (femaleChecked ? Number(femaleCount) > 0 : true));
    const canCreate =
        !!weighIn &&
        phase === 'manage' &&
        idOk &&
        atLeastOneGender &&
        exactlyOneGenderForIndividual &&
        clubOk &&
        headcountsOk &&
        !busy &&
        !bookingClosed;

    /* ────────────────────────────────────────────────────────────────
       Start actions (open modal + send SMS) + NOTICE LIGHTBOX
       ──────────────────────────────────────────────────────────────── */
    async function startCreate() {
        if (!canCreate || !weighIn) return;

        // Seçilen cinsiyetler
        const gendersChosen: Array<'M' | 'F'> = [];
        if (maleChecked) gendersChosen.push('M');
        if (femaleChecked) gendersChosen.push('F');

        // Aktif randevulara karşı blokaj kontrolü
        const blocked = gendersChosen.filter((g) => activeMine.some((a) => a.gender === g));
        if (blocked.length > 0) {
            const parts = blocked.map((g) => (g === 'M' ? 'erkek' : 'kadın'));
            const text =
                (parts.length === 2 ? 'Erkek ve kadın' : parts[0][0].toUpperCase() + parts[0].slice(1)) +
                ' için aktif bir randevunuz var. Önce iptal edip sonra yeni randevu alabilirsiniz.';
            // Lightbox'ı NOTICE modu ile aç
            setNoticeText(text);
            openCodeModal('notice');
            return;
        }

        // oluşturulacak cinsiyetler
        const toCreate: Array<{ gender: 'M' | 'F'; headcount: number }> = [];
        if (maleChecked) toCreate.push({ gender: 'M', headcount: isClub ? Math.max(1, Number(maleCount) || 1) : 1 });
        if (femaleChecked) toCreate.push({ gender: 'F', headcount: isClub ? Math.max(1, Number(femaleCount) || 1) : 1 });
        if (toCreate.length === 0) return;

        try {
            setBusy(true);
            await api.post('appointments/sms/send/', {
                phone,
                weigh_in: weighIn.id,
                action: 'create',
            });
            setPendingCreate(toCreate);
            openCodeModal('create');
        } catch {
            setMsg({ tone: 'err', text: 'SMS gönderilemedi.' });
        } finally {
            setBusy(false);
        }
    }

    async function startCancel(apptId: number) {
        if (!weighIn || !idOk) return;
        try {
            setBusy(true);
            await api.post('appointments/sms/send/', {
                phone,
                weigh_in: weighIn.id,
                action: 'cancel',
            });
            setPendingCancelId(apptId);
            openCodeModal('cancel');
        } catch {
            setMsg({ tone: 'err', text: 'SMS gönderilemedi.' });
        } finally {
            setBusy(false);
        }
    }

    function openCodeModal(mode: 'create' | 'cancel' | 'notice') {
        setModalMode(mode);
        if (mode !== 'notice') {
            setSmsCode('');
            setSmsErr(null);
        }
        setModalOpen(true);
        setTimeout(() => hiddenCodeInputRef.current?.focus(), 50);
    }
    function closeCodeModal() {
        setModalOpen(false);
        setPendingCreate([]);
        setPendingCancelId(null);
        setSmsCode('');
        setSmsErr(null);
        setNoticeText(null);
    }

    /* ────────────────────────────────────────────────────────────────
       Confirm modal (perform action with sms_code)
       ──────────────────────────────────────────────────────────────── */
    async function confirmModal() {
        if (!weighIn || smsCode.trim().length !== 6) return;
        setBusy(true);
        setSmsErr(null);

        try {
            if (modalMode === 'create') {
                for (const item of pendingCreate) {
                    await api.post<AppointmentDTO>('appointments/', {
                        weigh_in: weighIn.id,
                        phone,
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        is_club: isClub,
                        club_name: isClub ? (clubName.trim() || null) : null,
                        gender: item.gender,
                        headcount: item.headcount,
                        sms_code: smsCode.trim(),
                    });
                }
                setMsg({ tone: 'ok', text: 'Randevu(lar)ınız oluşturuldu.' });
            } else if (modalMode === 'cancel' && pendingCancelId) {
                await api.post<AppointmentDTO>(`appointments/${pendingCancelId}/cancel/`, {
                    phone,
                    sms_code: smsCode.trim(),
                });
                setMsg({ tone: 'ok', text: 'Randevu iptal edildi.' });
            }
            closeCodeModal();
            await refreshMine();
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            if (typeof detail === 'string' && /kod|code|geçersiz/i.test(detail)) {
                setSmsErr('Kod hatalı. Lütfen tekrar deneyin.');
            } else {
                setSmsErr('İşlem başarısız oldu.');
            }
        } finally {
            setBusy(false);
        }
    }

    /* ────────────────────────────────────────────────────────────────
       Small handlers
       ──────────────────────────────────────────────────────────────── */
    function onSwitchType(nextClub: boolean) {
        setIsClub(nextClub);
        if (!nextClub) {
            setMaleCount('1');
            setFemaleCount('1');
            if (maleChecked && femaleChecked) setFemaleChecked(false);
        }
    }
    function toggleMale() {
        setMaleChecked((p) => {
            const next = !p;
            if (!isClub && next && femaleChecked) setFemaleChecked(false);
            return next;
        });
    }
    function toggleFemale() {
        setFemaleChecked((p) => {
            const next = !p;
            if (!isClub && next && maleChecked) setMaleChecked(false);
            return next;
        });
    }
    function resetIdentity() {
        setPhase('identify');
        setMine([]);
        setMismatchWarn(null);
        setMsg(null);
    }

    const CountStepper = ({
                              value,
                              onChange,
                              disabled,
                          }: {
        value: string;
        onChange: (v: string) => void;
        disabled?: boolean;
    }) => {
        const n = clamp(Number(value || '1') || 1, 1, 999);
        return (
            <div className="flex items-stretch rounded-lg overflow-hidden border border-white/10">
                <button
                    type="button"
                    disabled={disabled || n <= 1}
                    onClick={() => onChange(String(clamp(n - 1, 1, 999)))}
                    className={clsx(
                        'px-3 text-sm font-medium',
                        disabled ? 'bg-[#151922] text-white/30' : 'bg-[#14171c] hover:bg-[#10141b] text-white/80'
                    )}
                >
                    −
                </button>
                <input
                    inputMode="numeric"
                    value={String(n)}
                    onChange={(e) => onChange(String(clamp(Number(e.target.value.replace(/\D/g, '')) || 1, 1, 999)))}
                    disabled={disabled}
                    className={clsx(
                        'w-14 sm:w-16 text-center bg-[#1b1f26] text-white px-2 outline-none',
                        disabled ? 'text-white/40' : ''
                    )}
                />
                <button
                    type="button"
                    disabled={disabled || n >= 999}
                    onClick={() => onChange(String(clamp(n + 1, 1, 999)))}
                    className={clsx(
                        'px-3 text-sm font-medium',
                        disabled ? 'bg-[#151922] text-white/30' : 'bg-[#14171c] hover:bg-[#10141b] text-white/80'
                    )}
                >
                    +
                </button>
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────── */
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
                        {weighIn ? (
                            <>
                                {fmtDate(weighIn.date)} · {hhmm(weighIn.start_time)} – {hhmm(weighIn.end_time)}
                                <span
                                    className={clsx(
                                        'ml-3 inline-flex items-center rounded px-2 py-0.5 text-xs border',
                                        bookingClosed
                                            ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                            : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                    )}
                                >
                  {bookingClosed ? 'Randevu Alımı Kapalı' : 'Randevu Alımı Açık'}
                </span>
                            </>
                        ) : (
                            'Bu turnuvada tartı günü tanımlı değil'
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                        onClick={() =>
                            navigator.clipboard
                                ?.writeText(window.location.href)
                                .then(
                                    () => setMsg({ tone: 'ok', text: 'Bağlantı kopyalandı.' }),
                                    () => setMsg({ tone: 'warn', text: 'Kopyalanamadı, adres çubuğundan kopyalayın.' })
                                )
                        }
                        disabled={busy}
                        className="px-3 py-2 rounded-lg bg-[#1f2229] border border-white/10 hover:border-emerald-400/30 text-xs sm:text-sm whitespace-nowrap"
                    >
                        Paylaşılabilir Bağlantı
                    </button>
                    <Link to={`/weigh/${tournament_slug}`} className="text-sm text-blue-300 hover:underline">
                        ← Detay
                    </Link>
                </div>
            </div>

            {/* Step 1: Identity */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#252a32] to-[#1c2027] p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">Kimlik Bilgileri</div>
                    {phase === 'manage' && (
                        <button onClick={resetIdentity} className="text-xs text-blue-300 hover:underline">
                            Değiştir
                        </button>
                    )}
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                    <label className="space-y-2 sm:col-span-1">
                        <div className="text-sm text-gray-300">
                            Telefon <span className="text-red-300">*</span>
                        </div>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+905xxxxxxxxx"
                            className="w-full px-3 py-2 rounded-lg bg-[#111318] border border-white/10 text-sm focus:ring-2 focus:ring-emerald-500/30"
                            disabled={phase === 'manage'}
                        />
                    </label>
                    <label className="space-y-2 sm:col-span-1">
                        <div className="text-sm text-gray-300">
                            Ad <span className="text-red-300">*</span>
                        </div>
                        <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#111318] border border-white/10 text-sm focus:ring-2 focus:ring-emerald-500/30"
                            disabled={phase === 'manage'}
                        />
                    </label>
                    <label className="space-y-2 sm:col-span-1">
                        <div className="text-sm text-gray-300">
                            Soyad <span className="text-red-300">*</span>
                        </div>
                        <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#111318] border border-white/10 text-sm focus:ring-2 focus:ring-emerald-500/30"
                            disabled={phase === 'manage'}
                        />
                    </label>
                </div>

                {mismatchWarn && (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm px-3 py-2">
                        {mismatchWarn}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                        onClick={onLookup}
                        disabled={!idOk || busy || phase === 'manage'}
                        className={clsx(
                            'px-4 py-2 rounded-lg font-medium shadow',
                            !idOk || busy || phase === 'manage'
                                ? 'bg-gray-600 text-white/80 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                        )}
                    >
                        Randevularımı Getir
                    </button>
                    <div className="text-xs text-gray-400">
                        Bilgiler doğrulandıktan sonra aktif ve geçmiş randevularınız gösterilir.
                    </div>
                </div>

                {msg && phase === 'manage' && (
                    <div
                        className={clsx(
                            'mt-1 rounded-lg px-3 py-2 text-sm border',
                            msg.tone === 'ok' && 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
                            msg.tone === 'warn' && 'bg-amber-500/10 text-amber-200 border-amber-400/20',
                            msg.tone === 'err' && 'bg-red-500/10 text-red-200 border-red-400/20'
                        )}
                    >
                        {msg.text}
                    </div>
                )}
            </section>

            {/* Step 2: Manage & Book */}
            {phase === 'manage' && (
                <>
                    {/* Quick Stats */}
                    <section className="grid grid-cols-2 gap-3">
                        <StatCard label="Aktif Randevu" value={activeMine.length || '—'} />
                        <StatCard label="Geçmiş (iptal)" value={cancelledMine.length || '—'} />
                    </section>

                    {/* Booking form */}
                    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#252a32] to-[#1c2027] p-5 space-y-5 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-white">Yeni Randevu Oluştur</div>
                            {bookingClosed && (
                                <span className="text-xs px-2 py-1 rounded border border-amber-400/30 bg-amber-500/10 text-amber-100">
                  Randevu Alımı Kapalı
                </span>
                            )}
                        </div>

                        {/* Segmented type */}
                        <div className="flex rounded-xl overflow-hidden border border-white/10">
                            <button
                                type="button"
                                onClick={() => onSwitchType(true)}
                                className={clsx(
                                    'flex-1 px-3 py-2 text-xs sm:text-sm transition-colors',
                                    isClub ? 'bg-emerald-600 text-white' : 'bg-[#111318] text-gray-300 hover:text-white hover:bg-[#14171c]'
                                )}
                            >
                                Kulüp
                            </button>
                            <button
                                type="button"
                                onClick={() => onSwitchType(false)}
                                className={clsx(
                                    'flex-1 px-3 py-2 text-xs sm:text-sm transition-colors',
                                    !isClub ? 'bg-emerald-600 text-white' : 'bg-[#111318] text-gray-300 hover:text-white hover:bg-[#14171c]'
                                )}
                            >
                                Bireysel
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 -mt-2">
                            Mevcut randevular <b>güncellenemez</b>. Değişiklik için iptal &rarr; yeniden alın.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-5">
                            {/* Kulüp adı */}
                            <label className="space-y-2">
                                <div className="text-sm text-gray-300">
                                    Kulüp Adı {isClub && <span className="text-red-300">*</span>}
                                </div>
                                <input
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    placeholder={isClub ? 'Örn. Yiğit Taekwondo' : 'Bireysel'}
                                    disabled={!isClub}
                                    className={clsx(
                                        'w-full px-3 py-2 rounded-lg bg-[#111318] border text-sm focus:ring-2 focus:ring-emerald-500/30',
                                        !isClub ? 'border-white/10 text-gray-400' : 'border-white/10'
                                    )}
                                />
                            </label>

                            {/* Info bubble */}
                            <div className="rounded-xl border border-white/10 bg-[#151922] p-3">
                                <div className="text-sm text-gray-200">
                                    Cinsiyet kuyrukları ayrı ilerler. Kulüp randevusunda her cinsiyet için ayrı sıra numarası verilir.
                                </div>
                            </div>

                            {/* Erkek */}
                            <div className="space-y-2">
                                <div className="text-sm text-gray-300 mb-1">Erkek Sporcu</div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={toggleMale}
                                        className={clsx(
                                            'px-3 py-2 rounded-lg text-sm border transition-colors',
                                            maleChecked
                                                ? 'bg-emerald-600 text-white border-emerald-500'
                                                : 'bg-[#111318] text-gray-300 border-white/10 hover:text-white hover:bg-[#14171c]'
                                        )}
                                    >
                                        {maleChecked ? 'Seçildi' : 'Seç'}
                                    </button>
                                    <CountStepper value={maleCount} onChange={setMaleCount} disabled={!isClub || !maleChecked} />
                                </div>
                                {activeMine.some((a) => a.gender === 'M') && (
                                    <div className="text-[11px] mt-1 text-amber-200">
                                        Bu cinsiyet için aktif randevunuz bulunuyor. Yeni almak için önce iptal etmelisiniz.
                                    </div>
                                )}
                            </div>

                            {/* Kadın */}
                            <div className="space-y-2">
                                <div className="text-sm text-gray-300 mb-1">Kadın Sporcu</div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={toggleFemale}
                                        className={clsx(
                                            'px-3 py-2 rounded-lg text-sm border transition-colors',
                                            femaleChecked
                                                ? 'bg-emerald-600 text-white border-emerald-500'
                                                : 'bg-[#111318] text-gray-300 border-white/10 hover:text-white hover:bg-[#14171c]'
                                        )}
                                    >
                                        {femaleChecked ? 'Seçildi' : 'Seç'}
                                    </button>
                                    <CountStepper value={femaleCount} onChange={setFemaleCount} disabled={!isClub || !femaleChecked} />
                                </div>
                                {activeMine.some((a) => a.gender === 'F') && (
                                    <div className="text-[11px] mt-1 text-amber-200">
                                        Bu cinsiyet için aktif randevunuz bulunuyor. Yeni almak için önce iptal etmelisiniz.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                            {!isClub && (
                                <div className="text-xs text-gray-400">
                                    Bireysel randevuda tek cinsiyet seçilir ve kişi sayısı <b>1</b>’dir.
                                </div>
                            )}
                            <button
                                onClick={startCreate}
                                disabled={!canCreate}
                                className={clsx(
                                    'px-4 py-2 rounded-lg font-medium shadow',
                                    !canCreate
                                        ? 'bg-gray-600 text-white/80 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                )}
                            >
                                Randevu Oluştur
                            </button>
                        </div>
                    </section>

                    {/* My Appointments */}
                    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#252a32] to-[#1c2027] p-5 space-y-4 shadow-lg">
                        <div className="text-white font-semibold">Randevularım</div>

                        {/* Aktifler */}
                        {activeMine.length === 0 ? (
                            <div className="text-sm text-gray-400">Aktif randevunuz yok.</div>
                        ) : (
                            activeMine.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-white/10 bg-[#14171c]"
                                >
                                    <div className="text-sm text-gray-100">
                                        <span className="mr-2 font-medium">{a.gender === 'M' ? 'Erkek' : 'Kadın'}</span>
                                        <span className="mr-2">
                      Sıra: <b>#{a.seq_no ?? '—'}</b>
                    </span>
                                        <span className="mr-2">
                      Kişi: <b>{a.headcount}</b>
                    </span>
                                        <span className="ml-2 text-xs text-gray-300">Önünüzde {a.athletes_ahead ?? 0} sporcu</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startCancel(a.id)}
                                            disabled={busy}
                                            className="px-3 py-1.5 rounded bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm"
                                        >
                                            İptal Et
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Geçmiş iptaller */}
                        <div className="pt-2">
                            <div className="text-sm text-gray-300 mb-2">Geçmiş (iptal edilenler)</div>
                            {cancelledMine.length === 0 ? (
                                <div className="text-sm text-gray-500">Kayıt yok.</div>
                            ) : (
                                cancelledMine.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-[#111318] text-gray-300"
                                    >
                                        <div className="text-sm">
                                            {a.gender === 'M' ? 'Erkek' : 'Kadın'} · Kişi: {a.headcount}{' '}
                                            <span className="ml-2 text-[11px] px-2 py-0.5 rounded border border-white/10">İptal</span>
                                        </div>
                                        <div className="text-xs text-gray-400">Sıra no: #{a.seq_no ?? '—'}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </>
            )}

            {/* Lightbox: SMS Code / NOTICE */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCodeModal} />
                    <div className="relative z-10 w-[min(92vw,30rem)] bg-[#2b2f37] border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="text-white font-semibold">
                                {modalMode === 'create' ? 'Doğrulama' : modalMode === 'cancel' ? 'İptal Doğrulaması' : 'Bilgilendirme'}
                            </div>
                            <button onClick={closeCodeModal} className="text-white/70 hover:text-white text-xl leading-none">
                                ×
                            </button>
                        </div>

                        {/* NOTICE CONTENT */}
                        {modalMode === 'notice' && (
                            <>
                                <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                                    {noticeText ||
                                        'Bu işlem için aktif randevu bulunuyor. Önce iptal edip sonra yeni randevu alabilirsiniz.'}
                                </div>
                                <div className="mt-5 flex items-center justify-end">
                                    <button
                                        onClick={closeCodeModal}
                                        className="px-4 py-2 rounded-lg bg-[#1f2229] border border-white/10 text-sm text-gray-200"
                                    >
                                        Tamam
                                    </button>
                                </div>
                            </>
                        )}

                        {/* CODE CONTENT */}
                        {modalMode !== 'notice' && (
                            <>
                                <p className="text-sm text-gray-300 mt-2">Telefonunuza gönderilen <b>6 haneli</b> kodu girin.</p>

                                {/* Fancy 6-box input (single hidden input drives UI) */}
                                <div className="mt-4" onClick={() => hiddenCodeInputRef.current?.focus()}>
                                    <input
                                        ref={hiddenCodeInputRef}
                                        value={smsCode}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setSmsCode(v);
                                            setSmsErr(null);
                                        }}
                                        inputMode="numeric"
                                        className="absolute opacity-0 pointer-events-none"
                                    />
                                    <div className="grid grid-cols-6 gap-2">
                                        {Array.from({ length: 6 }).map((_, i) => {
                                            const ch = smsCode[i] ?? '';
                                            const filled = ch !== '';
                                            return (
                                                <div
                                                    key={i}
                                                    className={clsx(
                                                        'h-12 rounded-xl border flex items-center justify-center text-xl font-semibold shadow-sm',
                                                        filled ? 'border-emerald-500/40 bg-emerald-500/10 text-white' : 'border-white/15 bg-[#1b1f26] text-white/60'
                                                    )}
                                                >
                                                    {ch || '•'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {smsErr && (
                                        <div className="mt-3 text-sm rounded-lg px-3 py-2 border border-red-400/30 bg-red-500/10 text-red-200">
                                            {smsErr}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex items-center justify-between">
                                    <button
                                        onClick={async () => {
                                            if (!weighIn) return;
                                            try {
                                                await api.post('appointments/sms/send/', {
                                                    phone,
                                                    weigh_in: weighIn.id,
                                                    action: modalMode === 'create' ? 'create' : 'cancel',
                                                });
                                                setSmsErr(null);
                                            } catch {
                                                setSmsErr('Kod tekrar gönderilemedi.');
                                            }
                                        }}
                                        className="text-sm text-blue-300 hover:underline"
                                    >
                                        Kodu tekrar gönder
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={closeCodeModal}
                                            className="px-3 py-2 rounded-lg bg-[#1f2229] border border-white/10 text-sm text-gray-200"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            onClick={confirmModal}
                                            disabled={busy || smsCode.length !== 6}
                                            className={clsx(
                                                'px-4 py-2 rounded-lg font-medium shadow text-sm',
                                                busy || smsCode.length !== 6
                                                    ? 'bg-gray-600 text-white/80 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                            )}
                                        >
                                            Onayla
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────
   Small UI
   ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#252a32] to-[#1c2027] p-4 shadow">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-2xl font-semibold text-white mt-1">{value}</div>
        </div>
    );
}
