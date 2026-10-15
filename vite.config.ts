import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Open the app in the default browser when the dev or preview server starts.
  server: { open: true },
  preview: { open: true },
});
