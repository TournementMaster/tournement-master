import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

interface Props {
    showToggle:    boolean
    showCreate:    boolean
    showSave:      boolean
    bracketTitle?: string
    toggleSidebar: () => void
    sidebarOpen:   boolean
}

export default function Header({
                                   showToggle,
                                   showCreate,
                                   showSave,
                                   bracketTitle,
                                   toggleSidebar,
                                   sidebarOpen,
                               }: Props) {
    const { isAuth, logout } = useAuth()
    const navigate          = useNavigate()
    const location          = useLocation()
    const [menu, setMenu]   = useState(false)

    const isDashboard = location.pathname === '/'

    const onCreate = () => {
        if (!isAuth) { alert('Lütfen giriş yapın.'); return }
        if (isDashboard) navigate('/create?mode=main')
    }

    return (
        <header className="flex items-center h-20 px-8 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950">
            {showToggle && (
                <button
                    onClick={toggleSidebar}
                    aria-label={sidebarOpen ? 'Kapat' : 'Aç'}
                    className="mr-6 p-3 rounded-full bg-orange-700/70 hover:bg-orange-600 text-white text-2xl shadow-lg transition-transform hover:scale-110"
                >
                    {sidebarOpen ? '❮' : '❯'}
                </button>
            )}

            <div className="flex items-center space-x-6">
                <Link to="/" className="text-3xl font-extrabold text-white">
                    Easy Tournament
                </Link>

                {/* Bracket sayfasında oluştur butonu görünmez; RootLayout'tan showCreate kontrolü geliyor */}
                {showCreate && (
                    <button
                        onClick={onCreate}
                        disabled={!isAuth}
                        className={`px-5 py-2 rounded-lg text-lg font-semibold text-white ${
                            isAuth ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600/50 cursor-not-allowed'
                        }`}
                    >
                        Turnuva Oluştur
                    </button>
                )}
            </div>

            {bracketTitle && (
                <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-amber-100 drop-shadow">
                    {bracketTitle}
                </div>
            )}

            <div className="ml-auto flex items-center space-x-6">
                {showSave && (
                    <button
                        onClick={() => alert('Kaydedildi!')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow"
                    >
                        💾 Kaydet
                    </button>
                )}

                {isAuth ? (
                    <div className="relative">
                        <img
                            src="https://placehold.co/40x40"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                            onClick={() => setMenu(m => !m)}
                        />
                        {menu && (
                            <div
                                onMouseLeave={() => setMenu(false)}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden"
                            >
                                <Link
                                    to="/"
                                    onClick={() => setMenu(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        logout()
                                        setMenu(false)
                                        navigate('/login', { replace: true })
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                    >
                        Giriş
                    </Link>
                )}
            </div>
        </header>
    )
}
