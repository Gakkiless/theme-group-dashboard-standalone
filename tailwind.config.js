/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        songtsam: "0 8px 24px rgba(0, 0, 0, 0.06)",
        soft: "0 4px 14px rgba(0, 0, 0, 0.05)",
      },
      fontFamily: {
        sans: [
          "HarmonyOS Sans",
          "Source Han Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
