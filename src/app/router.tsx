/* src/app/router.tsx */
import { createBrowserRouter } from 'react-router-dom';

/* Sayfalar */
import RootLayout   from './layouts/RootLayout.tsx';
import BracketPage  from './pages/Bracket/BracketPage.tsx';
import LoginPage    from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';   // ← import edildi

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true,       element: <BracketPage /> },
            { path: 'login',     element: <LoginPage   /> },
            { path: 'register',  element: <RegisterPage /> },  // ← Register rotası
            // { path: 'dashboard', element: <Dashboard /> },  ← ileride
        ],
    },
]);
