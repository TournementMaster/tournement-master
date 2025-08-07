/* =========================================================================
   ROUTER – “/bracket/*” kalıbı ile tüm id’ler tek sayfaya gider
   ========================================================================= */
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout.tsx';
import BracketPage from './pages/Bracket/BracketPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import Dashboard from './pages/Dashboard/Dashboard.tsx';
import CreatePage from './pages/Create/CreatePage.tsx';
import ProtectedRoute from './context/ProtectedRoute.tsx';
import TournamentSubListPage from './pages/Tournements/TournamentSubListPage.tsx';

export const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            { index: true, element: <Dashboard /> },

            /* ------- BRACKET ------- */
            { path: 'bracket/*', element: <BracketPage /> },

            /* ------- Alt turnuva listesi ------- */
            { path: 'tournements/:public_slug', element: <TournamentSubListPage /> },

            /* ------- Auth ------- */
            { path: 'login',    element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },

            /* ------- Protected ------- */
            {
                element: <ProtectedRoute />,
                children: [
                    { path: 'create', element: <CreatePage /> },
                ],
            },
        ],
    },
]);
