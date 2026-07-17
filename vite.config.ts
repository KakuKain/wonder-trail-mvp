import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // Keep artwork out of the entry script so the browser only downloads
    // assets for the screen the child is currently visiting.
    assetsInlineLimit: 0,
  },
});
