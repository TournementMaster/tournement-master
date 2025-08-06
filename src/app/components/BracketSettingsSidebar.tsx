/* Tema seçenekleri */
import { useSetTheme } from '../context/BracketThemeContext';
import type { ThemeKey } from '../context/BracketThemeContext';

const ITEMS:{key:ThemeKey;label:string}[]=[
    {key:'orange',  label:'Turuncu'},
    {key:'rounded', label:'Mor'},
];

export default function BracketSettingsSidebar(){
    const setTheme=useSetTheme();
    return(
        <aside className="w-56 bg-[#2d3038] rounded-lg p-4 shadow-lg mr-3 shrink-0">
            <h3 className="text-sm font-semibold mb-3">Tema Seç</h3>
            <ul className="space-y-1">
                {ITEMS.map(i=>(
                    <li key={i.key}>
                        <button
                            onClick={()=>setTheme(i.key)}
                            className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-700 text-sm"
                        >
                            {i.label}
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
