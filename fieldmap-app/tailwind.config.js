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
      },
      fontFamily: {
        // Use system font stack for best native feel and zero font-loading delay in the field
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
