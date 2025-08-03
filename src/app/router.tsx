import { createBrowserRouter } from 'react-router-dom';
import RootLayout from "./layouts/RootLayout.tsx";
import BracketPage from "./pages/Bracket/BracketPage.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true, element: <BracketPage /> },
            // { path: 'dashboard', element: <Dashboard /> }  ← ileride
        ],
    },
]);
