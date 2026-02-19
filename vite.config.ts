import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/recharts/")) return "charts";
            if (id.includes("/lucide-react/")) return "icons";
            if (id.includes("/@radix-ui/")) return "radix";
            return "vendor";
          }

          if (
            id.includes("/src/domain/personas/seed.ts") ||
            id.includes("/src/personas/store.tsx")
          ) {
            return "personas-data";
          }

          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
