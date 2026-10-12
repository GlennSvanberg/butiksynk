// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

function sourceFiles(dir: string): Array<string> {
  const out: Array<string> = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) {
      out.push(path)
    }
  }
  return out
}

test('klientkod innehåller inte demolösenordet', () => {
  const files = [...sourceFiles('src'), ...sourceFiles('shared')]
  const offenders = files.filter((file) => {
    const text = readFileSync(file, 'utf8')
    return (
      text.includes('DEMO_AUTH_PASSWORD') ||
      text.includes("set('password', 'demo')") ||
      text.includes('set("password", "demo")')
    )
  })
  expect(offenders).toEqual([])

  const login = readFileSync('src/routes/login.tsx', 'utf8')
  expect(login).not.toContain('som lösenord')
})
