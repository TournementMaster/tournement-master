import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

interface Props { toggleSidebar?: () => void }

export default function Header({ toggleSidebar }: Props) {
    const { isAuth, logout } = useAuth();
    const [open, setOpen]    = useState(false);
    const nav                = useNavigate();
    const { pathname }       = useLocation();

    const match = pathname.match(/^\/bracket\/(\d+)/);
    const currentMainId = match ? Number(match[1]) : null;

    const onCreate = () => {
        if (!isAuth) return;
        if (currentMainId) nav(`/create?mode=sub&parent=${currentMainId}`);
        else               nav(`/create?mode=main`);
    };

    const createBtn = isAuth
        ? 'ml-6 bg-blue-600 hover:bg-blue-700 text-base px-4 py-2 rounded'
        : 'ml-6 bg-blue-600/40 text-base px-4 py-2 rounded cursor-not-allowed';

    return (
        <header className="flex items-center justify-between bg-[#373a42] h-24 px-8 shadow-lg">
            {/* Sol */}
            <div className="flex items-center gap-6">
                {toggleSidebar && (
                    <button onClick={toggleSidebar} className="md:hidden text-gray-300 text-2xl">☰</button>
                )}
                <Link to="/" className="text-3xl font-extrabold tracking-tight">Bracket HQ</Link>

                <button disabled={!isAuth} onClick={onCreate} className={createBtn}>
                    Turnuva Oluştur
                </button>
            </div>

            {/* Sağ */}
            <div className="relative">
                {isAuth ? (
                    <>
                        <button
                            onClick={() => setOpen(!open)}
                            className="w-12 h-12 rounded-full bg-gray-500 overflow-hidden"
                        >
                            <img src="https://placehold.co/48x48" alt="avatar" />
                        </button>
                        {open && (
                            <div
                                className="absolute right-0 mt-3 w-48 bg-[#2d3038] rounded shadow-xl z-50"
                                onMouseLeave={() => setOpen(false)}
                            >
                                <Link to="/"          className="block px-4 py-2 hover:bg-gray-700">Dashboard</Link>
                                <Link to="/settings"  className="block px-4 py-2 hover:bg-gray-700">Ayarlar</Link>
                                <button
                                    onClick={() => { logout(); setOpen(false); nav('/login', { replace:true }); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-700"
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex gap-3">
                        <Link to="/login"    className="bg-blue-600 hover:bg-blue-700 text-base px-4 py-2 rounded">Giriş</Link>
                        <Link to="/register" className="bg-gray-700 hover:bg-gray-600 text-base px-4 py-2 rounded">Kayıt</Link>
                    </div>
                )}
            </div>
        </header>
    );
}
