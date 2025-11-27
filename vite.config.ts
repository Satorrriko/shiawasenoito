import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// GitHub Pages 部署配置：根据仓库名设置 base 路径
// 如果仓库名是 shiawasenoito，访问地址为 https://用户名.github.io/shiawasenoito/
export default defineConfig({
  plugins: [react()],
  base: "/shiawasenoito/"  // 修改为你的实际仓库名
});


