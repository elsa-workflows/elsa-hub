import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { prerenderBlog } from "./scripts/prerender-blog";
import { prerenderTraining } from "./scripts/prerender-training";

// Runs the blog prerender script after vite finishes the production bundle.
// We hook into the build itself (instead of npm's `postbuild` script) because
// Lovable hosting invokes `vite build` directly, which would otherwise skip
// postbuild and ship the SPA shell for every blog URL. The prerender logic is
// imported in-process so we don't need `tsx` (a devDependency) at build time.
function prerenderBlogPlugin(): Plugin {
  return {
    name: "elsa-prerender-blog",
    apply: "build",
    closeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        try {
          await prerenderBlog();
        } catch (e) {
          console.warn(
            `[elsa-prerender-blog] failed: ${(e as Error).message}; continuing.`,
          );
        }
      },
    },
  };
}

// Independent of the blog prerender: a failed blog index fetch must not
// skip Training, and a Training failure must fail the build.
function prerenderTrainingPlugin(): Plugin {
  return {
    name: "elsa-prerender-training",
    apply: "build",
    closeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        await prerenderTraining();
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
    mcpPlugin(),
    mode === "development" && componentTagger(),
    mode !== "development" && prerenderBlogPlugin(),
    mode !== "development" && prerenderTrainingPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
