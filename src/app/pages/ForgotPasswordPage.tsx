import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendResetEmail } from '../services/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setMsg(null);
        setBusy(true);
        try {
            await sendResetEmail(email);           // backend varsa çalışır; yoksa sessiz geçer
            setMsg('Eğer adres kayıtlıysa, parola sıfırlama e-postası gönderildi.');
        } catch {
            setMsg('İstek gönderilemedi, tekrar deneyin.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-[#1e1f23]">
            <form onSubmit={submit} className="bg-[#2d3038] p-8 rounded shadow w-[360px] space-y-4">
                <h1 className="text-center text-lg mb-2">Şifremi Unuttum</h1>

                {msg && <p className="text-sm text-emerald-300 text-center">{msg}</p>}

                <input
                    className="w-full px-3 py-2 rounded bg-gray-700"
                    placeholder="E-posta"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <button
                    type="submit"
                    disabled={!/\S+@\S+\.\S+/.test(email) || busy}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded disabled:opacity-50"
                >
                    Gönder
                </button>

                <div className="text-center text-sm">
                    <Link to="/login" className="text-blue-400 hover:underline">Girişe dön</Link>
                </div>
            </form>
        </div>
    );
}
