/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      spacing: {
        5: "1.25rem",
      },
      colors: {
        gray: {
          50: "#F9FAFB",
          400: "#9CA3AF",
          700: "#374151",
        },
      },
    },
  },
  plugins: [],
};
