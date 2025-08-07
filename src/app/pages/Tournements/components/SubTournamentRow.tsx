import { Link } from 'react-router-dom';
import type { SubTournament } from '../../../hooks/useSubTournaments';

function genderLabel(g: string) {
    if (g === 'M') return 'Male';
    if (g === 'F') return 'Female';
    return 'Mixed';
}

function buildSubtitle(s: SubTournament) {
    const age =
        Number.isFinite(s.age_min) && Number.isFinite(s.age_max)
            ? `Age ${s.age_min}–${s.age_max}`
            : undefined;

    const wmin = (s.weight_min ?? '').toString().trim();
    const wmax = (s.weight_max ?? '').toString().trim();
    const weight = wmin || wmax ? `Weight ${wmin || '-'}–${wmax || '-'}` : undefined;

    const pieces = [genderLabel(s.gender), age, weight].filter(Boolean);
    return pieces.join(' · ');
}

export default function SubTournamentRow({ item }: { item: SubTournament }) {
    const subtitle = buildSubtitle(item);

    return (
        <div className="bg-[#2d3038] rounded-lg px-5 py-4 flex items-center justify-between border border-transparent">
            {/* Sol kısım: ikon + başlık */}
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40">
                    <div className="w-5 h-5 border-2 rounded-sm border-gray-300" />
                </div>
                <div>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-gray-400 text-sm">{subtitle || '—'}</div>
                </div>
            </div>

            {/* Sağ kısım: katılımcı (bilinmiyor) + progress 0% + yönlendirme */}
            <div className="flex items-center gap-6">
                <div className="text-sm text-gray-300">— <span className="opacity-70">👤</span></div>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-5 bg-gray-700 rounded">
                        <div className="h-5 bg-green-500 rounded" style={{ width: `0%` }} />
                    </div>
                    <span className="text-sm text-gray-200 w-12 text-right">0%</span>
                </div>

                {/* İleri: isterseniz burada /bracket/:id gösterimine geçebilirsiniz */}
                <Link
                    to={`/bracket/${item.public_slug}?title=${encodeURIComponent(item.title)}`}
                    state={item}  // ← EKLENDİ
                    className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-sm"
                    title="Alt turnuvayı görüntüle"
                >
                    →
                </Link>
            </div>
        </div>
    );
}
