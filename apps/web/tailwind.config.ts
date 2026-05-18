import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201d",
        mist: "#eef6f2",
        clinical: "#187365",
        signal: "#c9472c",
        amber: "#b7791f"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(23, 32, 29, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
