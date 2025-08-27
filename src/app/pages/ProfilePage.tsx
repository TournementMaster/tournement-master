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
        </div>
    );
}
