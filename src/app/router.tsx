import { createBrowserRouter } from 'react-router-dom';
import RootLayout   from './layouts/RootLayout.tsx';
import BracketPage  from './pages/Bracket/BracketPage.tsx';
import LoginPage    from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import Dashboard    from './pages/Dashboard/Dashboard.tsx';
import CreatePage   from './pages/Create/CreatePage.tsx'; // ← yeni
import ProtectedRoute from './context/ProtectedRoute.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { path: 'bracket/:id', element: <BracketPage /> }, // ← ID’li
            { path: 'login',     element: <LoginPage /> },
            { path: 'register',  element: <RegisterPage /> },
            {
                element: <ProtectedRoute />,
                children: [
                    { index: true, element: <Dashboard /> },
                    { path: 'bracket/:id', element: <BracketPage /> },
                    { path: 'create', element: <CreatePage /> },
            ],
          },
        ],
    },
]);
