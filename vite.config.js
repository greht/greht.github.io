import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry);
    const destPath = resolve(dest, entry);
    statSync(srcPath).isDirectory()
      ? copyDir(srcPath, destPath)
      : copyFileSync(srcPath, destPath);
  }
}

function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    closeBundle() {
      copyDir(resolve(__dirname, "assets"), resolve(__dirname, "dist/assets"));
      copyDir(resolve(__dirname, "vendor"), resolve(__dirname, "dist/vendor"));
      copyDir(resolve(__dirname, "data"), resolve(__dirname, "dist/data"));
      copyFileSync(
        resolve(__dirname, "assets/images/Fondo-oscuro.svg"),
        resolve(__dirname, "dist/favicon.svg")
      );
      copyFileSync(
        resolve(__dirname, "navbar.html"),
        resolve(__dirname, "dist/navbar.html")
      );
      copyFileSync(
        resolve(__dirname, "footer.html"),
        resolve(__dirname, "dist/footer.html")
      );
    },
  };
}

export default defineConfig({
  root: ".",
  base: "/",
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        register: resolve(__dirname, "register.html"),
        "forgot-password": resolve(__dirname, "forgot-password.html"),
        "reset-password": resolve(__dirname, "reset-password.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        predictions: resolve(__dirname, "predictions.html"),
        ranking: resolve(__dirname, "ranking.html"),
        groups: resolve(__dirname, "groups.html"),
        bracket: resolve(__dirname, "bracket.html"),
        profile: resolve(__dirname, "profile.html"),
        tyc: resolve(__dirname, "tyc.html"),
        contacto: resolve(__dirname, "contacto.html"),
        "html/admin": resolve(__dirname, "html/admin.html"),
      },
    },
  },
  resolve: {
    alias: [
      { find: /^\/js\//, replacement: resolve(__dirname, "js/") + "/" },
      { find: /^\/config\//, replacement: resolve(__dirname, "config/") + "/" },
    ],
  },
  plugins: [copyStaticAssets()],
});
