import { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function ProfilePage() {
    const { isAuth } = useAuth();
    const username = (localStorage.getItem('username') || '').trim();
    const storedPass = sessionStorage.getItem('last_password') || '';
    const [show, setShow] = useState(false);

    if (!isAuth) return null;

    return (
        <div className="max-w-lg mx-auto mt-10 bg-[#2d3038] p-6 rounded-xl border border-white/10 text-white space-y-4">
            <h1 className="text-xl font-bold">Profilim</h1>

            <div>
                <label className="block text-sm mb-1 text-white/80">Kullanıcı Adı</label>
                <input className="w-full bg-[#1f2229] px-3 py-2 rounded" value={username} readOnly />
            </div>

            <div>
                <label className="block text-sm mb-1 text-white/80">Şifre</label>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-[#1f2229] px-3 py-2 rounded"
                        type={show ? 'text' : 'password'}
                        value={storedPass || 'Bu oturumda kayıtlı değil'}
                        readOnly
                    />
                    <button
                        onClick={() => setShow(s => !s)}
                        className="px-3 py-2 rounded bg-white/10 hover:bg-white/15"
                        disabled={!storedPass}
                    >
                        {show ? 'Gizle' : 'Göster'}
                    </button>
                </div>
                <p className="text-xs text-white/60 mt-1">
                    Not: Şifre yalnızca bu oturumda görüntülenebilir; tarayıcı kapandığında silinir.
                </p>
            </div>
        </div>
    );
}
