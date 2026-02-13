type Variant = 'main' | 'sub';

const COLORS: Record<
    Variant,
    { ring: string; inner: string; text: string; silhouette: string; outer?: string }
> = {
  main: {
    ring: '#1f63ad',        // mavi
    inner: '#ffffff',
    text: '#ffffff',
    silhouette: '#0b0f16',
    outer: '#ffffff',
  },
  sub: {
    ring: '#3f8f24',        // yeşil
    inner: '#0b0f16',
    text: '#ffffff',
    silhouette: '#6fcf3f',
    outer: '#ffffff',
  },
};

export function TurnuvaEmblem({
                                variant = 'main',
                                size = 92, // kart için daha uygun
                                className = '',
                              }: {
  variant?: Variant;
  size?: number;
  className?: string;
}) {
  const c = COLORS[variant];

  return (
      <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
      >
        <defs>
          {/* Yazının oturacağı yaylar */}
          <path id={`topArc-${variant}`} d="M 50 50 m -41 0 a 41 41 0 1 1 82 0" />
          <path id={`bottomArc-${variant}`} d="M 50 50 m 41 0 a 41 41 0 1 1 -82 0" />
        </defs>

        {/* Dış çerçeve */}
        <circle cx="50" cy="50" r="48" fill={c.outer ?? '#fff'} />
        {/* Renkli halka */}
        <circle cx="50" cy="50" r="46" fill={c.ring} />
        {/* İç daire */}
        <circle cx="50" cy="50" r="34" fill={c.inner} />

        {/* İnce çizgiler */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.95" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.95" />

        {/* Üst yazı */}
        <text
            fill={c.text}
            fontSize="7.2"
            fontWeight="800"
            letterSpacing="0.12em"
            fontFamily="system-ui, sans-serif"
        >
          <textPath href={`#topArc-${variant}`} startOffset="50%" textAnchor="middle" dy="-1">
            TURNUVAIST
          </textPath>
        </text>

        {/* Alt yazı */}
        <text
            fill={c.text}
            fontSize="7.2"
            fontWeight="800"
            letterSpacing="0.12em"
            fontFamily="system-ui, sans-serif"
        >
          <textPath href={`#bottomArc-${variant}`} startOffset="50%" textAnchor="middle" dy="2">
            TAEKWONDO
          </textPath>
        </text>

        {/* Silüet */}
        <g fill={c.silhouette} transform="translate(50,50) scale(0.82)">
          <ellipse cx="0" cy="-14" rx="5" ry="6" />
          <path d="M-4 -8 l0 10 l-3 2 l0 14 l6 0 l0-14 l-3-2 z" />
          <path d="M4 -6 l2 4 l6 14 l-4 0 l-4 -10 z" />
          <path d="M-6 8 l-2 2 l0 16 l4 0 l0-14 z" />
          <path d="M2 10 l4 0 l2 4 l2 14 l-4 0 l-2-10 z" />
        </g>
      </svg>
  );
}
