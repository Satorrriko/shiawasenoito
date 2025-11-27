import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// V1 默认使用相对根路径；部署到 GitHub Pages 时可根据仓库名配置 base
export default defineConfig({
  plugins: [react()],
  base: "./"
});


