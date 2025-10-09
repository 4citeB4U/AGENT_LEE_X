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
import pwasath from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      base: '/AGENT_LEE_X/',
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY)
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


