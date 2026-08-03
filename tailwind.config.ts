import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1F2556", // primária — fundos, header, textos de destaque
        blue: "#2F4599", // apoio — cards, divisores
        lightblue: "#8499CC", // apoio — fundos suaves, estados inativos
        orange: "#ED5B35", // destaque — CTAs, ícones ativos
        orange2: "#EF7B3A", // apoio — hover, variação de destaque
        peach: "#F3A888", // apoio — detalhes, ilustrações
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
