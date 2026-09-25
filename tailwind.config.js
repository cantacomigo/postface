/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fb: {
          blue: '#1877F2',
          hover: '#166FE5',
          light: '#E7F3FF',
          dark: '#0e5a9f',
          bg: '#F0F2F5',
          card: '#FFFFFF',
          text: '#050505',
          secondary: '#65676B',
          divider: '#CED0D4'
        }
      }
    },
  },
  plugins: [],
}
