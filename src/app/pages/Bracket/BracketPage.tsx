import { useParams } from 'react-router-dom';
import InteractiveBracket from './components/InteractiveBracket';

export default function BracketPage() {
    const { id } = useParams();
    return (
        <div className="flex-1 overflow-hidden">
            <InteractiveBracket bracketId={id ? Number(id) : undefined}/>
        </div>
    );
}
