/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Biologic Environmental brand palette
        teal: {
          dark: '#1C4A50',
          mid: '#577A7A',
          light: '#9AAFAF',
        },
        sage: '#C7D3D3',
        greylight: '#E4EAEA',
        olive: '#AFA96E',
        accent: '#E87D2F', // orange — primary action accent
        pink: '#E6007E',
        lavender: '#9B8EC4',
        skyblue: '#B8D4E3',
        // Recording indicator — a clean safety red distinct from the
        // brand pink used for destructive confirmations.
        'recording-red': '#D32F2F',
      },
      fontFamily: {
        // Montserrat (weight 500 = Medium) is the app's brand font.
        // System sans-serif fallback ensures the app still renders if
        // the Google Fonts CSS hasn't loaded yet (offline first launch).
        sans: [
          'Montserrat',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      // Set the default weight for the brand body text. Tailwind's
      // built-in `font-medium` class still produces 500, this just
      // ensures unstyled text renders at Medium too.
      fontWeight: {
        normal: '500',
      },
    },
  },
  plugins: [],
};
