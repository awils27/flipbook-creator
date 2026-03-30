import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repositoryName = 'flipbook-creator';

export default defineConfig({
  base: `/${repositoryName}/`,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
