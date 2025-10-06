/**
 * Local Tailwind configuration replacing CDN usage (CommonJS form for Node tooling under ESM package scope).
 */
module.exports = {
  content: [
    './index.html',
    './components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
