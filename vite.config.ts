import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/catalog": "http://localhost:3001",
      "/health": "http://localhost:3001",
      "/pvp": "http://localhost:3001",
    },
  },
});
