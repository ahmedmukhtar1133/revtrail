/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/dashboard/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['ui-rounded', '"SF Pro Rounded"', '-apple-system', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Cool greys, so every existing stone-* class follows the Deskworthy palette.
        stone: {
          50: '#f7f8fa',
          100: '#eef0f3',
          200: '#e0e3e9',
          300: '#c9ced6',
          400: '#8e98a5',
          500: '#5a6370',
          600: '#47505c',
          700: '#2c333a',
          800: '#1b2024',
          900: '#121519',
        },
        paper: '#f5f6f8',
        ink: '#121519',
        visitors: '#2747d6',
        visitorsSoft: '#e9ecf6',
        revenue: '#f0a63a',
        revenueInk: '#9a5a19',
        revenueSoft: '#fdebd0',
      },
      boxShadow: { card: '0 1px 2px rgba(18,21,25,0.04), 0 1px 1px rgba(18,21,25,0.02)' },
    },
  },
  plugins: [],
};
