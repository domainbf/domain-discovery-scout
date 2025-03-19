
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // 代理配置，将/api请求转发到正确的API端点
      '/api': {
        target: 'https://www.whoisxmlapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whois-query/, '/whoisserver/WhoisService')
      }
    }
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
