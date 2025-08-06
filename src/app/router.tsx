/* =========================================================================
   FILE: src/app/router.tsx   ← tamamı
   ========================================================================= */
import { createBrowserRouter } from 'react-router-dom';
import RootLayout     from './layouts/RootLayout.tsx';
import BracketPage    from './pages/Bracket/BracketPage.tsx';
import LoginPage      from './pages/LoginPage.tsx';
import RegisterPage   from './pages/RegisterPage.tsx';
import Dashboard      from './pages/Dashboard/Dashboard.tsx';
import CreatePage     from './pages/Create/CreatePage.tsx';
import ProtectedRoute from './context/ProtectedRoute.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,

        /* ---------- herkese açık alan ---------- */
        children: [
            { index: true, element: <Dashboard /> },          // Ana turnuvalar
            { path: 'bracket/:id', element: <BracketPage /> },// Sadece görüntüleme
            { path: 'login',     element: <LoginPage /> },
            { path: 'register',  element: <RegisterPage /> },

            /* ---------- giriş gerektiren alan ---------- */
            {
                element: <ProtectedRoute />,
                children: [
                    /* aynı dashboard'u yetkili görünümle tekrar göstermek istersen:
                       { index: true, element: <Dashboard /> }, */
                    { path: 'create',      element: <CreatePage /> },
                    /* Bracket’ı düzenleyebilmek istiyorsan korumalı kopyası: */
                    { path: 'bracket/:id/edit', element: <BracketPage /> },
                ],
            },
        ],
    },
]);
