import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout.tsx';
import BracketPage from './pages/Bracket/BracketPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import Dashboard from './pages/Dashboard/Dashboard.tsx';
import CreatePage from './pages/Create/CreatePage.tsx';
import ProtectedRoute from './context/ProtectedRoute.tsx';
import TournamentSubListPage from './pages/Tournements/TournamentSubListPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';

// ── YENİ SAYFALAR ──
import WeighDetailPage from './pages/Weigh/WeighDetailPage.tsx';
import WeighPublicBookPage from './pages/Weigh/WeighPublicBookPage.tsx';
import LeaderboardPage from './pages/Tournements/LeaderboardPage.tsx';
import ProfilePage from "./pages/ProfilePage.tsx";
import MyAppointmentsPage from './pages/Weigh/MyAppointmentsPage';

export const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            { index: true, element: <Dashboard /> },

            /* ------- BRACKET ------- */
            { path: 'bracket/*', element: <BracketPage /> },

            /* ------- Alt turnuva listesi ------- */
            { path: 'tournements/:public_slug', element: <TournamentSubListPage /> },

            /* ------- Leaderboard (ilk 8) ------- */
            { path: 'tournements/:public_slug/leaderboard', element: <LeaderboardPage /> },

            /* ------- Tartı günü: detay ve randevu ------- */
            { path: 'weigh/:tournament_slug', element: <WeighDetailPage /> },
            { path: 'weigh/:tournament_slug/book', element: <WeighPublicBookPage /> },

            /* ------- Auth ------- */
            { path: 'login', element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },
            { path: 'forgot', element: <ForgotPasswordPage /> },

            /* ------- Protected ------- */
            {
                element: <ProtectedRoute />,
                children: [
                    { path: 'profile', element: <ProfilePage /> },
                    { path: 'create', element: <CreatePage /> },
                    { path: "/my/appointments", element: <MyAppointmentsPage />},
                ],
            },
        ],
    },
]);
