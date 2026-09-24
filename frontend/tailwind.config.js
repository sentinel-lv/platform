/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#E4E8E0',
        porcelain: '#F4F5EF',
        ink: '#1B2A23',
        moss: '#24382E',
        insulator: '#175641',
        insulatordeep: '#0E3A2C',
        wire: '#9A6B00',
        fault: '#B3261E',
        faultdeep: '#7A1A14',
        recover: '#0F766E',
        line: '#1B2A23',
      },
      fontFamily: {
        display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        meter: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        plate: '3px 3px 0 0 #1B2A23',
        platesm: '2px 2px 0 0 #1B2A23',
      },
    },
  },
  plugins: [],
};
