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

    // Dashboard mı / bracket mi?
    const isDashboard = location.pathname === '/'

    // Oluştur düğmesi için label seçimi
    const createLabel = location.pathname.startsWith('/bracket')
        ? 'Alt Turnuva Oluştur'
        : 'Turnuva Oluştur'

    const onCreate = () => {
        if (!isAuth) {
            alert('Lütfen giriş yapın.')
            return
        }
        if (isDashboard) {
            navigate('/create?mode=main')
        } else if (location.pathname.startsWith('/bracket')) {
            // alt turnuva
            const slug = location.pathname.split('/')[2]
            const params = new URLSearchParams({ mode: 'sub', ctx: slug })
            navigate(`/create?${params.toString()}`)
        }
    }

    return (
        <header className="flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 h-20 px-8">
            {/* Toggle ok butonu (sadece bracket sayfasında) */}
            {showToggle && (
                <button
                    onClick={toggleSidebar}
                    aria-label={sidebarOpen ? 'Kapat' : 'Aç'}
                    className="mr-6 p-3 rounded-full bg-teal-400 hover:bg-teal-300 text-white text-2xl shadow-lg transition-transform hover:scale-110"
                >
                    {sidebarOpen ? '❮' : '❯'}
                </button>
            )}

            {/* Logo + Oluştur */}
            <div className="flex items-center space-x-6">
                <Link to="/" className="text-3xl font-extrabold text-white">
                    Easy Tournament
                </Link>

                {showCreate && (
                    <button
                        onClick={onCreate}
                        disabled={!isAuth}
                        className={`px-5 py-2 rounded-lg text-lg font-semibold text-white ${
                            isAuth ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-500/50 cursor-not-allowed'
                        }`}
                    >
                        {createLabel}
                    </button>
                )}
            </div>

            {/* Ortadaki bracket başlığı */}
            {bracketTitle && (
                <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-white">
                    {bracketTitle}
                </div>
            )}

            {/* Sağ uç profil + kaydet */}
            <div className="ml-auto flex items-center space-x-6">
                {showSave && (
                    <button
                        onClick={() => alert('Kaydedildi!')}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg shadow"
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
                        className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg"
                    >
                        Giriş
                    </Link>
                )}
            </div>
        </header>
    )
}
