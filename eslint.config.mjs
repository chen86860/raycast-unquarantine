import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // ray build 生成的文件，不该参与检查：它带着 @typescript-eslint v8 已移除的
  // ban-types 禁用注释，也用 `{}` 表示「没有偏好项」，两者都会被判成错误。
  { ignores: ["raycast-env.d.ts", "dist/", "metadata/"] },
  ...raycastConfig,
]);
