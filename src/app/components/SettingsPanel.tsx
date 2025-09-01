import { useState, useEffect } from 'react';
import { useSettings } from '../context/BracketSettingsCtx';
import { usePlayers } from '../hooks/usePlayers';

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={[
                'relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-200',
                checked ? 'bg-emerald-500' : 'bg-gray-500/70',
                'border', checked ? 'border-emerald-600' : 'border-gray-600',
                'shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300/60',
            ].join(' ')}
        >
      <span
          className={[
              'inline-block h-6 w-6 rounded-full bg-white',
              'shadow-[0_1px_2px_rgba(0,0,0,.25)] border border-gray-200',
              'transform transition-transform duration-200',
              checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
      />
        </button>
    );
}

/* ---------- seeding yardımcıları ---------- */
function seedOrder(size: number): number[] {
    if (size < 2) return [1];
    let prev = [1, 2];
    while (prev.length < size) {
        const n = prev.length * 2;
        const comp = prev.map((x) => n + 1 - x);
        const next: number[] = [];
        for (let i = 0; i < prev.length; i += 2) {
            const a = prev[i],
                b = prev[i + 1],
                A = comp[i],
                B = comp[i + 1];
            next.push(a, A, B, b);
        }
        prev = next;
    }
    return prev;
}
function nextPow2(n: number) {
    let s = 1;
    while (s < n) s <<= 1;
    return Math.max(4, s);
}
function firstRoundPairs(nPlayers: number) {
    const size = nextPow2(nPlayers);
    const order = seedOrder(size);
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
    return pairs;
}

function clashCount(
    mapping: Record<number, number>,
    clubsBySeed: Record<number, string | undefined>,
    nPlayers: number
) {
    const inv: Record<number, number | undefined> = {};
    for (const [sStr, slot] of Object.entries(mapping)) inv[slot] = Number(sStr);

    let c = 0;
    for (const [sa, sb] of firstRoundPairs(nPlayers)) {
        const A = inv[sa],
            B = inv[sb];
        if (!A || !B) continue;
        const ca = clubsBySeed[A]?.trim();
        const cb = clubsBySeed[B]?.trim();
        if (ca && cb && ca === cb) c++;
    }
    return c;
}

function reduceClubClashesMapping(
    mapping: Record<number, number>,
    clubsBySeed: Record<number, string | undefined>,
    nPlayers: number
) {
    const best = { ...mapping };
    let cur = clashCount(best, clubsBySeed, nPlayers);
    const seeds = Object.keys(best).map(Number);
    const MAX = Math.min(400, nPlayers * nPlayers);

    let improved = true,
        iter = 0;
    while (improved && iter < MAX) {
        improved = false;
        iter++;
        for (let i = 0; i < seeds.length; i++) {
            for (let j = i + 1; j < seeds.length; j++) {
                const s1 = seeds[i],
                    s2 = seeds[j];
                const a = best[s1],
                    b = best[s2];
                best[s1] = b;
                best[s2] = a;
                const score = clashCount(best, clubsBySeed, nPlayers);
                if (score < cur) {
                    cur = score;
                    improved = true;
                    break;
                }
                best[s1] = a;
                best[s2] = b;
            }
            if (improved) break;
        }
    }
    return best;
}

export default function SettingsPanel() {
    const { settings, set } = useSettings();
    const { players, setPlayers } = usePlayers();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [started, setStarted] = useState(false);

    // İlk açılışta globalden/datasetten oku
    useEffect(() => {
        const g = (window as any).__bracketState;
        if (g && typeof g.started === 'boolean') setStarted(Boolean(g.started));
        else setStarted(document.documentElement.getAttribute('data-bracket-started') === '1');
    }, []);

    // Canlı güncellemeleri dinle
    useEffect(() => {
        const h = (e: any) => setStarted(Boolean(e?.detail?.started));
        window.addEventListener('bracket:started', h);
        return () => window.removeEventListener('bracket:started', h);
    }, []);


    const shufflePlacement = () => {

        const n = players.length;
        if (n < 2) return;

        const slots = Array.from({ length: n }, (_, i) => i + 1);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }

        const base: Record<number, number> = {};
        for (const p of players) base[p.seed] = slots[p.seed - 1];

        const clubs: Record<number, string | undefined> = Object.fromEntries(
            players.map((p) => [p.seed, p.club])
        );

        const fixed = reduceClubClashesMapping(base, clubs, n);

        set({ placementMap: fixed, version: settings.version + 1 });
    };
    // Geri sayım (InteractiveBracket) tamamlanınca asıl karıştırmayı yap
    useEffect(() => {
        const h = () => shufflePlacement();
        window.addEventListener('bracket:do-shuffle', h);
        return () => window.removeEventListener('bracket:do-shuffle', h);
        // shufflePlacement kapanımındaki state'leri güncel tutmak için effect her değişimde yeniden bağlanır
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players, settings.version]);

    const doReset = () => {
        // Braket bileşenine “sert sıfırla” de
        window.dispatchEvent(new CustomEvent('bracket:hard-reset'));

        // placement ve versiyonu da sıfırla (slot hesapları yeniden kurulsun)
        set({ placementMap: null, version: settings.version + 1 });

        // güvenlik için players'ı burada da temizliyoruz (idempotent)
        // setPlayers([]);

        setConfirmOpen(false);
    };


    return (
        <div className="space-y-6">
            <h3 className="font-semibold mb-2">Ayarlar</h3>

            {/* ✅ Maç Numaraları */}
            <section className="rounded-lg bg-[#111318] border border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Maç numaralarını göster</div>
                        <div className="text-xs text-gray-400">
                            Kutuların solunda / yanında maç no rozeti
                        </div>
                    </div>
                    <Switch
                        checked={settings.showMatchNo}
                        onChange={(v) => set({ showMatchNo: v })}
                    />
                </div>
            </section>

            <div className="h-2" />

            {!started && (
                <section className="rounded-lg bg-[#111318] border border-white/10 p-4 space-y-3">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('bracket:request-start'))}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow"
                    >
                        Maçı Başlat
                    </button>
                    <p className="text-xs text-gray-400">
                        Başladıktan sonra sporcu listesi kilitlenir.
                    </p>
                </section>
            )}

            <section className="rounded-lg bg-[#111318] border border-white/10 p-4 space-y-5">
                <button
                   onClick={() => {
                     window.dispatchEvent(new CustomEvent('bracket:request-shuffle'));
                   }}
                    className="w-full py-2 rounded border border-sky-500/70 text-sky-200 hover:bg-sky-900/20 font-semibold"
                    title="Seed sabit kalır; braket üzerindeki yerler rastgelelenir (aynı kulüp çakışmaları minimize edilir)"
                >
                    Şablonu Karıştır
                </button>

                <div className="h-3" />

                <button
                    onClick={() => setConfirmOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow"
                >
                    Şablonu Sıfırla
                </button>
            </section>


            {confirmOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() => setConfirmOpen(false)}
                    />
                    <div className="relative z-10 w-[min(90vw,28rem)] bg-[#2d3038] rounded-xl p-6 border border-white/10">
                        <h4 className="text-lg font-semibold mb-2">
                            Şablonu sıfırlamak istediğinize emin misiniz?
                        </h4>
                        <p className="text-sm text-gray-300">
                            Bu işlem oyuncu adlarını, skorları, saat ve kort bilgilerini temizler.
                            Geri alınamaz.
                        </p>
                        <div className="mt-5 flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={doReset}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-semibold"
                            >
                                Evet, sıfırla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
