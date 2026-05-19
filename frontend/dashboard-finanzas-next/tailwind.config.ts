import type { Config } from "tailwindcss";

const config: Config = {
  // 🌙 ESTA LÍNEA ES LA QUE HACE FUNCIONAR EL MODO OSCURO
  darkMode: "class", 
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Opcional: Podemos definir tus colores Sakura aquí para usarlos más fácil
      colors: {
        sakura: {
          pink: "#FFB7C5",
          blue: "#87CEEB",
        }
      }
    },
  },
  plugins: [],
};
export default config;