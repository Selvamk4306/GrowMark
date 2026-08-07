/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        accent: '#F4A833',
        background: '#F5F7FA',
        card: '#FFFFFF',
        textPrimary: '#1A1A1A',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
