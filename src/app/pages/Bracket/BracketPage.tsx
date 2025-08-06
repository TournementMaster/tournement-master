import { useParams } from 'react-router-dom';
import InteractiveBracket from './components/InteractiveBracket';

export default function BracketPage() {
    const params = useParams();
    const idParam   = params.id;
    const slugParam = params.public_slug ?? (idParam && isNaN(Number(idParam)) ? idParam : undefined);

    const bracketId   = idParam && !isNaN(Number(idParam)) ? Number(idParam) : undefined;
    const bracketSlug = slugParam;

    return (
        <div className="flex-1 overflow-hidden">
            <InteractiveBracket bracketId={bracketId} bracketSlug={bracketSlug} />
        </div>
    );
}