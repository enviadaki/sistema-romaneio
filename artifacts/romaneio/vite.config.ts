import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const _require = createRequire(import.meta.url);
const clerkReactPkg = _require.resolve("@clerk/react/package.json");
const clerkSharedDir = path.dirname(
  createRequire(clerkReactPkg).resolve("@clerk/shared/package.json"),
);

function buildClerkSharedAliases() {
  const pkgPath = path.join(clerkSharedDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    exports?: Record<string, unknown>;
  };
  const exports = pkg.exports ?? {};
  const aliases: { find: string; replacement: string }[] = [];

  for (const [key, value] of Object.entries(exports)) {
    if (key === "." || key === "./package.json" || key.includes("*")) continue;
    const subpath = key.replace("./", "");
    const find = `@clerk/shared/${subpath}`;

    let esmFile: string | undefined;
    if (typeof value === "string") {
      esmFile = value;
    } else if (value && typeof value === "object") {
      const v = value as Record<string, unknown>;
      const imp = v["import"];
      if (typeof imp === "string") {
        esmFile = imp;
      } else if (imp && typeof imp === "object") {
        const iv = imp as Record<string, unknown>;
        if (typeof iv["default"] === "string") esmFile = iv["default"];
      }
    }

    if (esmFile) {
      aliases.push({ find, replacement: path.join(clerkSharedDir, esmFile) });
    }
  }

  const wildcardSubpaths = [
    "authorization", "browser", "clerkEventBus", "deprecated",
    "deriveState", "error", "getEnvVariable", "getToken", "keys",
    "loadClerkJsScript", "object", "telemetry", "versionCheck",
    "jwtPayloadParser",
  ];
  for (const sub of wildcardSubpaths) {
    const find = `@clerk/shared/${sub}`;
    if (!aliases.some((a) => a.find === find)) {
      const file = path.join(clerkSharedDir, `dist/runtime/${sub}.mjs`);
      if (fs.existsSync(file)) aliases.push({ find, replacement: file });
    }
  }

  return aliases;
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
    ),
    "import.meta.env.VITE_CLERK_PROXY_URL": JSON.stringify(
      process.env.VITE_CLERK_PROXY_URL ?? "",
    ),
  },
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(import.meta.dirname, "src"),
      },
      {
        find: "@assets",
        replacement: path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      ...buildClerkSharedAliases(),
    ],
    dedupe: ["react", "react-dom", "@clerk/react"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
