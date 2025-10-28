/* LEEWAY HEADER
TAG: BUILD.CONFIG.VITE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: settings
ICON_SIG: CD534113
5WH: WHAT=Vite configuration; WHY=Bundle & dev server setup; WHO=Leeway Core (agnostic); WHERE=vite.config.ts; WHEN=2025-10-05; HOW=Vite + React plugin
SPDX-License-Identifier: MIT
*/

import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development'
    return {
      plugins: [react()],
      // Pin dev server to loopback and a stable port to avoid firewall prompts and port churn
      server: {
        host: '127.0.0.1',
        port: 5175,
        strictPort: true
      },
      // Use root base in dev to avoid 404s when opening http://localhost:5173/
      // Keep GitHub Pages base in build/preview
      base: isDev ? '/' : '/AGENT_LEE_X/',
      define: {
          __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString()),
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.AGENT_LEE_X || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.AGENT_LEE_X || env.GEMINI_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.AGENT_LEE_X || env.GEMINI_API_KEY),
        // Lightning (GPU) config — prefer public endpoint without embedding tokens when possible
        'process.env.LIGHTNING_BASE_URL': JSON.stringify(env.LIGHTNING_BASE_URL || env.LIGHTNING_URL || ''),
        'process.env.LIGHTNING_PROJECT_ID': JSON.stringify(env.LIGHTNING_PROJECT_ID || ''),
        'process.env.LIGHTNING_API_TOKEN': JSON.stringify(env.LIGHTNING_API_TOKEN || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets'
      }
    };
});


