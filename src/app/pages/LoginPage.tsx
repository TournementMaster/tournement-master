
import {type FormEvent, useState } from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from "../context/useAuth.ts";


export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setU] = useState('');
    const [password, setP] = useState('');
    const [error, setErr]  = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        try {
            await login(username, password);
            navigate('/', { replace: true });
        } catch {
            setErr('Geçersiz kullanıcı adı veya şifre');
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-[#1e1f23]">
            <form
                onSubmit={handleSubmit}
                className="bg-[#2d3038] p-8 rounded shadow w-80 space-y-4"
            >
                <h1 className="text-center text-lg mb-2">Giriş Yap</h1>

                {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="Kullanıcı adı"
                    value={username}
                    onChange={e => setU(e.target.value)}
                />

                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="Şifre"
                    type="password"
                    value={password}
                    onChange={e => setP(e.target.value)}
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
                >
                    Gönder
                </button><p className="text-center text-sm">
                Hesabın yok mu?{' '}
                <Link to="/register" className="text-blue-400 hover:underline">
                    Kayıt Ol
                </Link>
            </p>
            </form>
        </div>
    );
}
