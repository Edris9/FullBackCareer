module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // kollar alla React-filer
  theme: {
    extend: {
      colors: {
        primary: '#1D4ED8',
        primaryLight: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#F9FAFB',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};