import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5181 },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
