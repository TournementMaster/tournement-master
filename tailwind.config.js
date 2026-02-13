import defaultTheme from 'tailwindcss/defaultTheme.js'; // ← .js eklendi export default { /* … */ };

export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Outfit"', '"Inter"', ...defaultTheme.fontFamily.sans],
                display: ['"Outfit"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                premium: {
                    dark: '#050505',
                    card: '#121212',
                    glass: 'rgba(20, 20, 20, 0.7)',
                    border: 'rgba(255,255,255,0.08)',
                    accent: '#6366f1', // Indigo-500 equivalent
                    gold: '#FFD700',
                    silver: '#C0C0C0',
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'neon': '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
                'gold-glow': '0 0 15px rgba(255, 215, 0, 0.3)',
                'elite': '0 10px 40px -10px rgba(0,0,0,0.7)',
            }
        },
    },
    plugins: [],
};
