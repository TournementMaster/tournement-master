import { Link } from 'react-router-dom';

export default function Sidebar({open, toggle,}: {
    open: boolean;
    toggle: () => void;
}) {
    return (
        <aside
            className={`${
                open ? 'w-56' : 'w-0 md:w-16'
            } transition-all duration-200 bg-[#2d3038] overflow-hidden shadow-lg`}
        >
            <div className="flex items-center justify-between h-12 px-4 md:justify-center">
        <span className={`${open ? 'block' : 'hidden md:block'} font-semibold`}>
          Menü
        </span>
                <button
                    onClick={toggle}
                    className={`${open ? 'block' : 'hidden md:block'} text-gray-400`}
                >
                    ⨯
                </button>
            </div>

            <nav className="flex flex-col gap-1 mt-4">
                <Link
                    to="/"
                    className="mx-3 px-3 py-2 rounded hover:bg-gray-700 text-sm"
                >
                    Tüm Turnuvalar
                </Link>
            </nav>
        </aside>
    );
}
