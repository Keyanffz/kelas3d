import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Alias @/ sama dengan tsconfig, supaya tes bisa mengimpor kode komponen.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
