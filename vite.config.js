import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Em modo local (servidor offline) o app é servido em /gerenciador/
  // Em produção (Firebase Hosting) fica na raiz /
  base: mode === 'offline' ? '/gerenciador/' : '/',
}));
