import { useSearchParams } from 'react-router-dom';
import TournamentWizard from './TournamentWizard';

export default function CreatePage() {
    const [sp] = useSearchParams();
    const mode = sp.get('mode') === 'sub' ? 'sub' : 'main';
    const parent = sp.get('parent');
    const defaultParentId = parent ? Number(parent) : undefined;
    return <TournamentWizard mode={mode} defaultParentId={defaultParentId} />;
}
