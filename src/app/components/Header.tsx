import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

interface Props {
    showCreate:    boolean
    showSave:      boolean
    bracketTitle?: string
}

export default function Header({ showCreate, showSave, bracketTitle }: Props) {
    const { isAuth, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [menu, setMenu] = useState(false)

    const onBracket = location.pathname.startsWith('/bracket')
    const onSubList = location.pathname.startsWith('/tournements')

    // “Turnuva Oluştur” düğmesi için metin
    const createLabel = (onBracket || onSubList) ? 'Alt Turnuva Oluştur' : 'Turnuva Oluştur'

    const onCreate = () => {
        if (!isAuth) {
            alert('Lütfen giriş yapın.')
            return
        }

        if (location.pathname === '/') {
            // Ana dashboard → ana turnuva oluştur
            navigate('/create?mode=main')
            return
        }

        if (onSubList) {
            // /tournements/:public_slug?parent=<id>
            const sp = new URLSearchParams(location.search)
            const parent = sp.get('parent')
            navigate(`/create?mode=sub${parent ? `&parent=${parent}` : ''}`)
            return
        }

        if (onBracket) {
            // Bracket içinden alt turnuva
            navigate('/create?mode=sub')
            return
        }

        navigate('/create?mode=main')
    }

    return (
        <header
            className={[
                'relative flex items-center h-16 sm:h-20 px-4 sm:px-8',
                // Solda hafif yeşil → sağda mor, göz yormayan
                'bg-gradient-to-r from-emerald-300/18 via-emerald-300/10 to-violet-400/22',
                'backdrop-blur-[1px]',
            ].join(' ')}
        >
            {/* Sol: logo + oluştur */}
            <div className="flex items-center gap-4 sm:gap-6">
                <Link to="/" className="text-2xl sm:text-3xl font-extrabold text-white">
                    Easy Tournament
                </Link>

                {showCreate && (
                    <button
                        onClick={onCreate}
                        disabled={!isAuth}
                        className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-sm font-semibold
              ${isAuth ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600/50 cursor-not-allowed'}
            `}
                        title={createLabel}
                    >
                        <span aria-hidden>＋</span>
                        {createLabel}
                    </button>
                )}
            </div>

            {/* Ortada: alt turnuva başlığı (varsa) */}
            {bracketTitle && (
                <div className="absolute left-1/2 -translate-x-1/2 text-base sm:text-xl font-semibold text-white/90 tracking-wide">
                    {bracketTitle}
                </div>
            )}

            {/* Sağ: Kaydet + profil */}
            <div className="ml-auto flex items-center gap-3 sm:gap-6">
                {showSave && (
                    <button
                        onClick={() => alert('Kaydedildi!')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow"
                        title="Kaydet"
                    >
                        {/* Disket simgesi */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7v14h18V7l-4-4H7L3 7z"/><path d="M7 7h10v7H7z"/><path d="M7 21V14h10v7"/>
                        </svg>
                        Kaydet
                    </button>
                )}

                <div className="relative">
                    <img
                        src="https://placehold.co/40x40"
                        alt="avatar"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white cursor-pointer"
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
            </div>
        </header>
    )
}
