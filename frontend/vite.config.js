import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPrefix = (env.VITE_API_PREFIX || "/api").replace(/\/+$/, "");

  return {
    plugins: [react()],
    base: command === "build" ? "/static/frontend/" : "/",
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT || env.DEV_PORT || 5173),
      strictPort: true,
      allowedHosts: (env.DEV_ALLOWED_HOSTS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      proxy: {
        [apiPrefix]: {
          target: env.DJANGO_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
