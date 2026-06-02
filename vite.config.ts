import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawnSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

// Runs the blog prerender script after vite finishes the production bundle.
// We hook into the build itself (instead of relying on the npm `postbuild`
// script) because Lovable hosting invokes `vite build` directly, which would
// otherwise skip postbuild and ship the SPA shell for every blog URL.
function prerenderBlogPlugin(): Plugin {
  return {
    name: "elsa-prerender-blog",
    apply: "build",
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const result = spawnSync(
          "npx",
          ["tsx", "scripts/prerender-blog.ts"],
          { stdio: "inherit", env: process.env },
        );
        if (result.status !== 0) {
          console.warn(
            `[elsa-prerender-blog] script exited with status ${result.status}; continuing.`,
          );
        }
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode !== "development" && prerenderBlogPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
