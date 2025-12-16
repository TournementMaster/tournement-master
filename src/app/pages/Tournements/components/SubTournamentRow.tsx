import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SubTournament } from '../../../hooks/useSubTournaments';
import { api } from '../../../lib/api';

const premiumItem =
    'flex w-full items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-white/10 font-premium';
const premiumText =
    'bg-gradient-to-r from-amber-200 via-emerald-200 to-violet-300 bg-clip-text text-transparent';

function genderLabel(g: string) {
    if (g === 'M') return 'Erkek';
    if (g === 'F') return 'Kadın';
    return 'Karma';
}

function ageCategoryFromAges(ageMin: unknown, ageMax: unknown) {
    const lo = Number(ageMin);
    const hiNum = Number(ageMax);
    const hi = Number.isFinite(hiNum) ? hiNum : Infinity;

    // ÖNCE daha spesifik olanlar
    if (lo === 0 && hi === 10) return 'Küçükler';
    if (lo === 10 && hi === 13) return 'Minikler';
    if (lo === 13 && hi === 15) return 'Yıldızlar';
    if (lo === 15 && hi === 18) return 'Gençler';
    if (lo === 18 && hi === 20) return 'Ümitler';

    // Büyükler: genelde age_max 200/Infinity gibi gelir
    if (lo === 18 && hi >= 200) return 'Büyükler';

    if (Number.isFinite(lo) && Number.isFinite(hi) && hi !== Infinity) return `Yaş ${lo}–${hi}`;
    if (Number.isFinite(lo)) return `Yaş ${lo}+`;
    return 'Yaş';
}

function weightMaxOnly(s: SubTournament) {
    const raw = (s as any).weight;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();

    const wmin = Number((s.weight_min ?? '').toString().replace(',', '.'));
    const wmax = Number((s.weight_max ?? '').toString().replace(',', '.'));

    if (Number.isFinite(wmax) && wmax > 0 && wmax < 200) return String(wmax);
    if (Number.isFinite(wmin) && wmin > 0) return `${wmin}+`;
    if (Number.isFinite(wmax) && wmax > 0) return String(wmax);
    return '-';
}

function buildSubtitle(s: SubTournament) {
    const pieces = [
        genderLabel(s.gender),
        ageCategoryFromAges(s.age_min, s.age_max),
        `${weightMaxOnly(s)} kg`,
    ].filter(Boolean);

    return pieces.join(' · ');
}

export default function SubTournamentRow({
                                             item,
                                             onChanged,
                                             canManage = false,
                                         }: {
    item: SubTournament;
    onChanged: () => void;
    canManage?: boolean;
}) {
    const navigate = useNavigate();
    const subtitle = useMemo(() => buildSubtitle(item), [item]);
    const to = `/bracket/${item.public_slug}?title=${encodeURIComponent(item.title)}`;
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const goTo = () => navigate(to, { state: item });

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (ev: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    async function doDelete() {
        try {
            await api.delete(`subtournaments/${encodeURIComponent(item.public_slug)}/`);
            setConfirmOpen(false);
            onChanged();
        } catch {
            alert('Silme başarısız.');
        }
    }

    return (
        <div
            onClick={goTo}
            className="relative block rounded-lg bg-[#2d3038] px-5 py-4 border border-transparent
                   hover:bg-[#2f333b] hover:border-emerald-400/30
                   focus:outline-none focus:ring-2 focus:ring-emerald-400/40 cursor-pointer"
            title="Alt turnuvayı görüntüle"
        >
            <div className="flex items-center justify-between gap-3">
                {/* SOL */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-300 text-xl select-none">🏆</div>
                    <div className="min-w-0">
                        <div className="font-semibold truncate">{item.title}</div>
                        <div className="text-gray-400 text-sm truncate">
                            <span>{subtitle || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* SAĞ */}
                {canManage && (
                    <div className="relative z-10 shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); }}
                            onClick={() => setMenuOpen((v) => !v)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gray-900/70 border border-white/15 text-gray-100 text-[20px] font-semibold hover:bg-gray-900/90 shadow"
                            title="Seçenekler" aria-haspopup="menu" aria-expanded={menuOpen} type="button"
                        >
                            ⋯
                        </button>
                        {menuOpen && (
                            <div role="menu" className="absolute right-0 mt-2 w-56 bg-[#161a20] border border-white/10 rounded-xl overflow-hidden z-30 shadow-2xl">
                                <button role="menuitem" onClick={() => { setMenuOpen(false); navigate(to, { state: item }); }} className={`${premiumItem}`} type="button">
                                    <span className="text-[18px]">✏️</span>
                                    <span className={`${premiumText}`}>Düzenle</span>
                                </button>
                                <button role="menuitem" onClick={() => { setMenuOpen(false); setConfirmOpen(true); }} className={`${premiumItem} text-red-300 hover:bg-red-500/10`} type="button">
                                    <span className="text-[18px]">🗑️</span>
                                    <span className={`${premiumText}`}>Sil</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {confirmOpen && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmOpen(false);
                    }}
                >
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        className="relative z-10 w-[min(90vw,28rem)] bg-[#2d3038] rounded-2xl p-6 border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-semibold mb-2">Silmek istediğinize emin misiniz?</h4>
                        <p className="text-sm text-gray-300">“{item.title}” kalıcı olarak silinecek.</p>
                        <div className="mt-5 flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                                type="button"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={doDelete}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-semibold"
                                type="button"
                            >
                                Evet, sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
