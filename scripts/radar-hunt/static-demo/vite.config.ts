// Versión estática de demostración de Radar Hunt (sin servidor ni Supabase), para
// publicarla como página: npx vite build -c scripts/radar-hunt/static-demo/vite.config.ts
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

/**
 * Los módulos *.server (Supabase con service_role, etc.) no deben llegar al navegador:
 * se sustituyen por un módulo con las mismas exportaciones que falla si se usa.
 */
function stubServerModules(): Plugin {
  const PREFIX = "\0rh-server-stub:";
  return {
    name: "rh-stub-server-modules",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!/\.server(\.ts)?$/.test(source) || !importer) return null;
      const real = await this.resolve(source, importer, { skipSelf: true });
      return real ? PREFIX + real.id : null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const code = fs.readFileSync(id.slice(PREFIX.length), "utf8");
      const names = new Set<string>();
      for (const m of code.matchAll(
        /export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g,
      ))
        names.add(m[1]);
      for (const m of code.matchAll(/export\s*\{([^}]*)\}/g))
        for (const part of m[1].split(",")) {
          const t = part.trim();
          if (!t || t.startsWith("type ")) continue;
          names.add((t.split(/\s+as\s+/)[1] ?? t).trim());
        }
      const lines = [
        "const fail = () => { throw new Error('Solo disponible en el servidor.'); };",
        "const stub = new Proxy(fail, { get: () => stub, apply: fail });",
        ...[...names].map((n) => `export const ${n} = stub;`),
        "export default stub;",
      ];
      return lines.join("\n");
    },
  };
}

export default defineConfig({
  root: here,
  base: "./",
  publicDir: path.join(root, "public"),
  plugins: [stubServerModules(), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^node:.*$/, replacement: path.join(here, "stub-node.ts") },
      {
        find: /^@tanstack\/react-start(\/server)?$/,
        replacement: path.join(here, "stub-react-start.ts"),
      },
      { find: /^@\//, replacement: path.join(root, "src") + "/" },
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  define: {
    "import.meta.env.VITE_RH_DEMO": JSON.stringify("true"),
    "import.meta.env.VITE_STATIC_DEMO": JSON.stringify("true"),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(""),
    "process.env": "{}",
  },
  build: {
    outDir: process.env.RH_STATIC_OUT ?? path.join(root, "dist-static"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
