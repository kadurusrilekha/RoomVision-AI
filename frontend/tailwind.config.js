/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F7F7F2', // Warm off-white
        charcoal: {
          DEFAULT: '#202A35',
          50: '#f6f7f9',
          100: '#edeef1',
          200: '#d7d9e0',
          500: '#718096',
          700: '#3c4858',
          800: '#2d3748',
          900: '#202A35',
        },
        muted: '#718096', // Muted grey
        teal: {
          50: '#f0f9fa',
          100: '#def2f4',
          200: '#bee5e9',
          300: '#8ed1d9',
          400: '#55b5c1',
          500: '#087E8B', // Deep teal primary accent
          600: '#066873',
          700: '#06545d',
          800: '#09454c',
          900: '#0b393f',
        },
        surface: {
          wall: '#2878E5',  // Architectural blue for walls (RGB: 40, 120, 229)
          floor: '#22A06B', // Emerald green for floors (RGB: 34, 160, 107)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(32, 42, 53, 0.05), 0 1px 2px 0 rgba(32, 42, 53, 0.03)',
        'card': '0 4px 6px -1px rgba(32, 42, 53, 0.06), 0 2px 4px -1px rgba(32, 42, 53, 0.03)',
        'card-hover': '0 10px 15px -3px rgba(32, 42, 53, 0.08), 0 4px 6px -2px rgba(32, 42, 53, 0.04)',
      }
    },
  },
  plugins: [],
}
