/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#101216",
        "graphite-soft": "#1A1D23",
        paper: "#EEEBE3",
        dim: "#8A8F98",
        amber: {
          DEFAULT: "#FFB020",
          soft: "rgba(255,176,32,0.12)",
        },
        cyan: {
          DEFAULT: "#5EEAD4",
          soft: "rgba(94,234,212,0.12)",
        },
        rose: {
          DEFAULT: "#FB6F6F",
          soft: "rgba(251,111,111,0.12)",
        },
      },
      fontFamily: {
        display: ["'Instrument Serif'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
