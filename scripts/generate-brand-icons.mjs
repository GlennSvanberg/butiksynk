/**
 * Generates favicon / PWA PNGs from the transparent master at repo root: selio.png
 * Run: node scripts/generate-brand-icons.mjs
 */
import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Jimp } from 'jimp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcPath = join(root, 'selio.png')
const publicDir = join(root, 'public')

const outputs = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon.png', 32],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
]

async function main() {
  await copyFile(srcPath, join(publicDir, 'selio.png'))
  const base = await Jimp.read(srcPath)
  base.background = 0

  for (const [filename, size] of outputs) {
    const img = base.clone().contain({ w: size, h: size })
    await img.write(join(publicDir, filename))
  }

  console.log('Brand icons written from selio.png → public/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
