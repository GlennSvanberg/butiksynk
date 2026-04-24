import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

/** Vercel sets `VERCEL=1` during CI build; use Node preset locally so `npm start` works. */
const nitroPreset = process.env.VERCEL === '1' ? 'vercel' : 'node'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    nitro({ preset: nitroPreset }),
    viteReact(),
  ],
})
