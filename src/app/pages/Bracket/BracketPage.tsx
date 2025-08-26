// Sayfa: sadece InteractiveBracket’ı gösterir
import InteractiveBracket from './components/InteractiveBracket/InteractiveBracket';

export default function BracketPage() {
    return (
        <div className="flex-1">
            <InteractiveBracket />
        </div>
    );
}
