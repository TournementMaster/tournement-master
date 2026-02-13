import { useEffect, useMemo, useRef, useState } from 'react';

export type EliteSelectOption = { value: string; label: string };

export function EliteSelect({
    value,
    onChange,
    options,
    ariaLabel,
    className = '',
    menuClassName = '',
    disabled = false,
}: {
    value: string;
    onChange: (v: string) => void;
    options: EliteSelectOption[];
    ariaLabel?: string;
    className?: string;
    menuClassName?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const active = useMemo(
        () => options.find((o) => o.value === value) || options[0],
        [options, value],
    );

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''}`} ref={rootRef}>
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={[
                    'inline-flex items-center justify-between gap-2',
                    'bg-[#0b0f16]/70 border border-white/15 text-slate-100',
                    'px-3 py-2 rounded-lg text-sm font-medium',
                    'hover:bg-[#0b0f16] hover:border-white/25 transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-premium-accent/50',
                    className,
                ].join(' ')}
            >
                <span className="truncate">{active?.label ?? 'Seçiniz'}</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`shrink-0 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div
                    role="listbox"
                    className={[
                        'absolute left-0 right-0 mt-2 z-[9999]',
                        'rounded-xl overflow-hidden',
                        'bg-[#0b0f16] border border-white/15 shadow-2xl',
                        menuClassName,
                    ].join(' ')}
                >
                    {options.map((opt) => {
                        const isActive = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className={[
                                    'w-full text-left px-3 py-2 text-sm font-medium',
                                    'transition-colors',
                                    isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-200 hover:bg-white/5 hover:text-white',
                                ].join(' ')}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

