// src/app/pages/Bracket/BracketPage.tsx

// ↪ Başka yerlerde ihtiyaç olduğunda bu dosyadan import edilebilsin diye RE-EXPORT


// Sayfa: sadece InteractiveBracket’ı gösterir
import InteractiveBracket from './components/InteractiveBracket/InteractiveBracket';


export default function BracketPage() {
    return (
        <div className="flex-1">
            <InteractiveBracket />
        </div>
    );
}
