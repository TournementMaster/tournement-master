import { useSettings } from '../context/BracketSettingsCtx'

export default function SettingsPanel() {
    const { settings, set } = useSettings()

    return (
        <div className="space-y-4">
            <h3 className="font-semibold mb-2">Ayarlar</h3>

            <section className="rounded-lg bg-[#111318] border border-white/10 p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Turnuva Yapısı</div>
                        <div className="text-xs text-gray-400">Çift taraflı eleme (Double Elimination)</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.double}
                            onChange={e => set({ double: e.target.checked })}
                            className="accent-emerald-400 w-5 h-5"
                        />
                    </label>
                </div>
            </section>

            <section className="rounded-lg bg-[#111318] border border-white/10 p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Skor Gösterimi</div>
                        <div className="text-xs text-gray-400">Maç kutularında set skorlarını göster</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.showScores}
                            onChange={e => set({ showScores: e.target.checked })}
                            className="accent-emerald-400 w-5 h-5"
                        />
                    </label>
                </div>
            </section>
        </div>
    )
}
