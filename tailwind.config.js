import defaultTheme from 'tailwindcss/defaultTheme.js'; // ← .js eklendi export default { /* … */ };

export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Source Sans Pro"', ...defaultTheme.fontFamily.sans],
            },
        },
    },
    plugins: [],
};
