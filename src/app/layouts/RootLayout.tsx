import { Outlet } from 'react-router-dom';

export default function RootLayout() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* ← burada sabit header/side olabilir */}
            <Outlet />
        </div>
    );
}
