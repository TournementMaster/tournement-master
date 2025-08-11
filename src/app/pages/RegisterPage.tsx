import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [username, setU] = useState('');
    const [email, setE] = useState('');
    const [password, setP] = useState('');
    const [password2, setP2] = useState('');
    const [error, setErr] = useState<string | null>(null);

    const canSubmit =
        username.trim().length >= 3 &&
        /\S+@\S+\.\S+/.test(email) &&
        password.length >= 6 &&
        password === password2;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!canSubmit) {
            setErr('Lütfen alanları doğru doldurun.');
            return;
        }
        try {
            await register(username, password, email);
            navigate('/', { replace: true });
        } catch {
            setErr('Kayıt başarısız, lütfen tekrar deneyin');
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-[#1e1f23]">
            <form onSubmit={handleSubmit} className="bg-[#2d3038] p-8 rounded shadow w-[360px] space-y-4">
                <h1 className="text-center text-lg mb-2">Kayıt Ol</h1>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="Kullanıcı adı"
                    value={username}
                    onChange={e => setU(e.target.value)}
                />
                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="E-posta"
                    type="email"
                    value={email}
                    onChange={e => setE(e.target.value)}
                />
                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="Şifre (min 6 karakter)"
                    type="password"
                    value={password}
                    onChange={e => setP(e.target.value)}
                />
                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="Şifre (tekrar)"
                    type="password"
                    value={password2}
                    onChange={e => setP2(e.target.value)}
                />

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded disabled:opacity-50"
                >
                    Kaydol
                </button>

                <div className="flex items-center justify-between text-sm">
                    <Link to="/login" className="text-blue-400 hover:underline">Giriş Yap</Link>
                    <Link to="/forgot" className="text-blue-400 hover:underline">Şifremi Unuttum</Link>
                </div>
            </form>
        </div>
    );
}
