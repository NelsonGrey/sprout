/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    // RTL's auto-cleanup-after-each-test only registers when it can see a
    // real `afterEach` global — without this, DOM from one test leaks into
    // the next within the same file.
    globals: true,
  },
});
