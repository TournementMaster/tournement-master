import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

interface Props {
    showSave: boolean
    showCreate: boolean
    bracketTitle?: string
    toggleSidebar: () => void
    sidebarOpen: boolean
}

export default function Header({
                                   showSave,
                                   showCreate,
                                   bracketTitle,
                                   toggleSidebar,
                                   sidebarOpen,
                               }: Props): ReactNode {
    const { isAuth, logout } = useAuth()
    const nav      = useNavigate()
    const location = useLocation()
    const [menu, setMenu] = useState(false)

    const isDashboard = location.pathname === '/'
    const subMatch    = location.pathname.match(/^\/bracket\/(.+)/)
    const isBracket   = !!subMatch
    const createLabel = isBracket ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur'

    const onCreate = () => {
        if (!isAuth) return alert('Lütfen giriş yapın')
        if (isDashboard) nav('/create?mode=main')
        else if (isBracket) {
            const slug = subMatch![1]
            nav(`/create?mode=sub&ctx=${encodeURIComponent(slug)}`)
        }
    }

    return (
        <header className="flex items-center justify-between bg-[#373a42] h-16 px-6 shadow-lg relative">
            {/* Sol: Logo + Create */}
            <div className="flex items-center gap-6">
                <Link to="/" className="text-xl font-extrabold text-white whitespace-nowrap">
                    Easy Tournament
                </Link>
                {showCreate && (
                    <button
                        disabled={!isAuth}
                        onClick={onCreate}
                        className={`px-4 py-2 rounded text-sm ${
                            isAuth ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600/40 cursor-not-allowed'
                        }`}
                    >
                        {createLabel}
                    </button>
                )}
            </div>

            {/* Orta: Bracket Başlığı */}
            {bracketTitle && (
                <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-amber-300 whitespace-nowrap">
                    {decodeURIComponent(bracketTitle)}
                </div>
            )}

            {/* Sağ: Toggle + Save + Profile */}
            <div className="flex items-center gap-4">
                {/* Arrow toggle */}
                <button
                    onClick={toggleSidebar}
                    aria-label={sidebarOpen ? 'Kapat' : 'Aç'}
                    className="text-2xl rounded-full bg-gradient-to-r from-teal-400 to-green-300 p-1 hover:opacity-80 transition"
                >
                    {sidebarOpen ? '←' : '→'}
                </button>

                {showSave && (
                    <button
                        onClick={() => alert('(Mock) Kaydedildi')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm text-white"
                    >
                        💾 Kaydet
                    </button>
                )}

                {isAuth ? (
                    <div className="relative">
                        <img
                            src="https://placehold.co/36x36"
                            alt="avatar"
                            className="w-9 h-9 rounded-full border border-white/20 cursor-pointer"
                            onClick={() => setMenu(o => !o)}
                        />
                        {menu && (
                            <div
                                onMouseLeave={() => setMenu(false)}
                                className="absolute right-0 mt-2 w-40 bg-[#2d3038] rounded shadow-lg z-50"
                            >
                                <Link
                                    to="/"
                                    onClick={() => setMenu(false)}
                                    className="block px-4 py-2 hover:bg-gray-700 text-white"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        logout()
                                        setMenu(false)
                                        nav('/login', { replace: true })
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm text-white"
                    >
                        Giriş
                    </Link>
                )}
            </div>
        </header>
    )
}
