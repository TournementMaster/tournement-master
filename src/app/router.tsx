import { createBrowserRouter } from 'react-router-dom';
import RootLayout   from './layouts/RootLayout.tsx';
import BracketPage  from './pages/Bracket/BracketPage.tsx';
import LoginPage    from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import Dashboard    from './pages/Dashboard/Dashboard.tsx'; // ← KULLANILACAK

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true,      element: <BracketPage /> },
            { path: 'login',    element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },
            { path: 'dashboard', element: <Dashboard /> }, // ← EKLE / YORUMDAN ÇIKAR
        ],
    },
]);
