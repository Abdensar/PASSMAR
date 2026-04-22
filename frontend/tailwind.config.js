/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#8B2635",
          DEFAULT: "#6A1E2A",
          dark: "#4A1520",
        },
        gold: {
          light: "#D4AF37",
          DEFAULT: "#B8860B",
          dark: "#8B6914",
        },
        blockchain: {
          light: "#FAE19E",
          DEFAULT: "#D4AF37",
          dark: "#B8860B",
        },
        valid: {
          light: "#4A8B5C",
          DEFAULT: "#2F6B3C",
          dark: "#1E4A2A",
        },
        warning: {
          light: "#F59E0B",
          DEFAULT: "#D97706",
          dark: "#B45309",
        },
        background: {
          light: "#FDF6E3",
          DEFAULT: "#FDF8F0",
          dark: "#1A1A2E",
        },
        surface: {
          light: "#FAE19E",
          DEFAULT: "#2A2A3E",
          dark: "#1F1F2E",
        },
        text: {
          light: "#2A2A3E",
          DEFAULT: "#E5E5E5",
          dark: "#F5F5F5",
        },
        muted: {
          light: "#6B7280",
          DEFAULT: "#9CA3AF",
          dark: "#D1D5DB",
        },
      },
    },
  },
  plugins: [],
};