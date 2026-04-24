/**
 * Generates favicon / PWA PNGs from repo root selio.png.
 * - Autocrops uniform transparent margins (no Photoshop).
 * - Uses cover() so the mark fills each square size (tiny edge crop vs letterboxing).
 * Run: npm run build:icons
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Jimp } from 'jimp'
import pngToIco from 'png-to-ico'

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

/** Tight bounding box on non-transparent pixels; tolerates soft PNG edges. */
function trimTransparent(source) {
  const img = source.clone()
  img.autocrop({ tolerance: 0.12, cropOnlyFrames: false })
  if (img.bitmap.width < 4 || img.bitmap.height < 4) {
    return source.clone()
  }
  return img
}

async function main() {
  await copyFile(srcPath, join(publicDir, 'selio.png'))

  const master = await Jimp.read(srcPath)
  const glyph = trimTransparent(master)

  for (const [filename, size] of outputs) {
    const img = glyph.clone()
    img.background = 0
    img.cover({ w: size, h: size })
    await img.write(join(publicDir, filename))
  }

  const ico = await pngToIco([
    await readFile(join(publicDir, 'favicon-16x16.png')),
    await readFile(join(publicDir, 'favicon-32x32.png')),
  ])
  await writeFile(join(publicDir, 'favicon.ico'), ico)

  console.log(
    'Brand icons + favicon.ico written (trimmed + cover) from selio.png → public/',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
