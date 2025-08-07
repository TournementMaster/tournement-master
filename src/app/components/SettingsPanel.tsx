import { useSettings } from '../context/BracketSettingsCtx'

export default function SettingsPanel() {
    const { settings, set } = useSettings()

    return (
        <div className="space-y-4">
            <h3 className="font-semibold mb-2">Ayarlar</h3>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={settings.double}
                    onChange={e => set({ double: e.target.checked })}
                    className="accent-teal-400"
                />
                <span>Çift Taraflı</span>
            </label>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={settings.showScores}
                    onChange={e => set({ showScores: e.target.checked })}
                    className="accent-teal-400"
                />
                <span>Puanları Göster</span>
            </label>
        </div>
    )
}
