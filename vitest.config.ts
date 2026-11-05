import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Standalone Vitest config (independent of the app's Lovable vite wrapper).
// Resolves the "@/*" alias via the project's tsconfig and runs the pure-logic
// unit tests in a Node environment — no DOM, no server/Supabase imports.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
