import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const assetsDirectory = path.resolve('dist/assets')
const budgets = {
  jsGzipBytes: 250 * 1024,
  cssGzipBytes: 100 * 1024,
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

try {
  const files = await collectFiles(assetsDirectory)
  const assets = []

  for (const file of files) {
    const extension = path.extname(file).toLowerCase()
    if (extension !== '.js' && extension !== '.css') continue

    const { readFile } = await import('node:fs/promises')
    const content = await readFile(file)
    const gzipBytes = gzipSync(content, { level: 9 }).byteLength
    assets.push({ file: path.relative(assetsDirectory, file), extension, gzipBytes })
  }

  if (assets.length === 0) {
    throw new Error('No JavaScript or CSS build assets found. Run npm run build first.')
  }

  console.log('CampusConnect compressed asset budget')
  console.table(
    assets
      .sort((left, right) => right.gzipBytes - left.gzipBytes)
      .map((asset) => ({
        asset: asset.file,
        gzipKB: (asset.gzipBytes / 1024).toFixed(1),
        budgetKB:
          (asset.extension === '.js' ? budgets.jsGzipBytes : budgets.cssGzipBytes) /
          1024,
      })),
  )

  const violations = assets.filter(
    (asset) =>
      asset.gzipBytes >
      (asset.extension === '.js' ? budgets.jsGzipBytes : budgets.cssGzipBytes),
  )

  if (violations.length > 0) {
    console.error(
      `\\nBundle budget exceeded by: ${violations.map((asset) => asset.file).join(', ')}`,
    )
    process.exitCode = 1
  } else {
    console.log('All emitted JS/CSS assets are within their gzip budgets.')
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
