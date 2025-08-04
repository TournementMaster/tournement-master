import { createBrowserRouter } from 'react-router-dom';
import RootLayout from "./layouts/RootLayout.tsx";
import BracketPage from "./pages/Bracket/BracketPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true, element: <BracketPage /> },
            { path: 'login', element: <LoginPage /> },
            // { path: 'dashboard', element: <Dashboard /> }  ← ileride
        ],
    },
]);
