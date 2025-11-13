import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// A linha do "lovable-tagger" foi removida

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // A PARTE DOS PLUGINS FICARÁ ASSIM
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
