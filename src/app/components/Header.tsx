import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../context/useAuth.ts";

interface Props {
    toggleSidebar?: () => void;
}

export default function Header({ toggleSidebar }: Props) {
    const { isAuth, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const nav = useNavigate();
    const { pathname } = useLocation();

    // /bracket/:id yolundan id’yi yakala (içerideysek alt turnuvaya yönlendireceğiz)
    const match = pathname.match(/^\/bracket\/(\d+)/);
    const currentMainId = match ? Number(match[1]) : null;

    const onCreate = () => {
        if (!isAuth) return;
        if (currentMainId) {
            nav(`/create?mode=sub&parent=${currentMainId}`);
        } else {
            nav(`/create?mode=main`);
        }
    };

    const createBtnClasses = isAuth
        ? 'ml-4 bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1 rounded'
        : 'ml-4 bg-blue-600/40 text-sm px-3 py-1 rounded cursor-not-allowed';

    return (
        <header className="flex items-center justify-between bg-[#373a42] h-12 px-4 shadow">
            {/* Sol */}
            <div className="flex items-center gap-3">
                {toggleSidebar && (
                    <button onClick={toggleSidebar} className="md:hidden text-gray-300">☰</button>
                )}
                <Link to="/" className="text-lg font-semibold">Bracket HQ</Link>

                <button disabled={!isAuth} onClick={onCreate} className={createBtnClasses}>
                    Turnuva Oluştur
                </button>
            </div>

            {/* Sağ */}
            <div className="relative">
                {isAuth ? (
                    <>
                        <button onClick={() => setOpen(!open)} className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden">
                            <img src="https://placehold.co/32x32" alt="avatar" />
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-2 w-40 bg-[#2d3038] rounded shadow z-50" onMouseLeave={() => setOpen(false)}>
                                <Link to="/" className="block px-4 py-2 hover:bg-gray-700" onClick={() => setOpen(false)}>Dashboard</Link>
                                <Link to="/settings" className="block px-4 py-2 hover:bg-gray-700" onClick={() => setOpen(false)}>Settings</Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setOpen(false);
                                        nav('/login', { replace: true });
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-700"
                                >
                                    Quit
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex gap-2">
                        <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1 rounded">Login</Link>
                        <Link to="/register" className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1 rounded">Register</Link>
                    </div>
                )}
            </div>
        </header>
    );
}
