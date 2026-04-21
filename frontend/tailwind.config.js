export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          50: "#f4fbff",
          100: "#e6f5ff",
          200: "#bee6ff",
          300: "#85d0ff",
          500: "#1593ff",
          700: "#0f5da8",
          900: "#0d2f4f",
        },
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 93, 168, 0.08)",
      },
    },
  },
  plugins: [],
};
