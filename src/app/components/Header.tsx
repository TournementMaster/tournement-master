import { useState } from 'react';
import { Link } from 'react-router-dom';
import {useAuth} from "../context/useAuth.ts";

interface Props {
    toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: Props) {
    const { isAuth, logout } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <header className="flex items-center justify-between bg-[#373a42] h-12 px-4 shadow">
            {/* ● Sol kısım */}
            <div className="flex items-center gap-3">
                <button onClick={toggleSidebar} className="md:hidden text-gray-300">
                    ☰
                </button>

                <Link to="/" className="text-lg font-semibold">
                    Bracket HQ
                </Link>

                <button
                    className="ml-4 bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1 rounded opacity-60 cursor-not-allowed"
                    disabled
                >
                    Turnuva Oluştur
                </button>
            </div>

            {/* ● Sağ kısım */}
            <div className="relative">
                {isAuth ? (
                    <>
                        <button
                            onClick={() => setOpen(!open)}
                            className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden"
                        >
                            <img src="https://placehold.co/32x32" alt="avatar" />
                        </button>

                        {open && (
                            <div
                                className="absolute right-0 mt-2 w-40 bg-[#2d3038] rounded shadow z-50"
                                onMouseLeave={() => setOpen(false)}
                            >
                                <Link
                                    to="/"
                                    className="block px-4 py-2 hover:bg-gray-700"
                                    onClick={() => setOpen(false)}
                                >
                                    Dashboard
                                </Link>

                                <Link
                                    to="/settings"
                                    className="block px-4 py-2 hover:bg-gray-700"
                                    onClick={() => setOpen(false)}
                                >
                                    Settings
                                </Link>

                                <button
                                    onClick={() => {
                                        logout();
                                        setOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-700"
                                >
                                    Quit
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <Link
                        to="/login"
                        className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1 rounded"
                    >
                        Login
                    </Link>
                )}
            </div>
        </header>
    );
}
