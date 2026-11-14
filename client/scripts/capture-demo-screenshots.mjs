import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5173'
const outputDirectory = path.resolve(
  process.env.DEMO_SCREENSHOT_DIR || '../artifacts/screenshots',
)

const accounts = [
  {
    role: 'student',
    email: process.env.DEMO_STUDENT_EMAIL,
    password: process.env.DEMO_STUDENT_PASSWORD,
    pages: [
      ['dashboard', '/'],
      ['courses', '/courses'],
      ['attendance', '/attendance'],
      ['announcements', '/announcements'],
      ['events', '/events'],
      ['submissions', '/submissions'],
    ],
  },
  {
    role: 'faculty',
    email: process.env.DEMO_FACULTY_EMAIL,
    password: process.env.DEMO_FACULTY_PASSWORD,
    pages: [
      ['dashboard', '/'],
      ['assignment-management', '/assignment-management'],
      ['submissions-review', '/submissions'],
      ['attendance', '/attendance'],
      ['announcements', '/announcements'],
    ],
  },
  {
    role: 'coordinator',
    email: process.env.DEMO_COORDINATOR_EMAIL,
    password: process.env.DEMO_COORDINATOR_PASSWORD,
    pages: [
      ['dashboard', '/'],
      ['clubs', '/clubs-events'],
      ['events', '/events'],
      ['enrollments', '/enrollments'],
      ['faculty-course-management', '/faculty-course-management'],
    ],
  },
  {
    role: 'admin',
    email: process.env.DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
    pages: [
      ['dashboard', '/'],
      ['faculty-management', '/faculty-management'],
      ['enrollments', '/enrollments'],
      ['faculty-course-management', '/faculty-course-management'],
    ],
  },
]

const missing = accounts
  .filter((account) => Boolean(account.email) !== Boolean(account.password))
  .map((account) => account.role)

if (missing.length) {
  throw new Error(
    `Both DEMO_${missing[0].toUpperCase()}_EMAIL and DEMO_${missing[0].toUpperCase()}_PASSWORD must be set together.`,
  )
}

const configuredAccounts = accounts.filter(
  (account) => account.email && account.password,
)

if (!configuredAccounts.length) {
  throw new Error(
    'Configure at least one DEMO_<ROLE>_EMAIL and DEMO_<ROLE>_PASSWORD pair.',
  )
}

await fs.mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const failures = []

try {
  for (const account of configuredAccounts) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    try {
      await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('College email').fill(account.email)
      await page.getByLabel('Password', { exact: true }).fill(account.password)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), {
        timeout: 20_000,
      })

      for (const [name, route] of account.pages) {
        try {
          await page.goto(`${baseURL}${route}`, {
            waitUntil: 'domcontentloaded',
          })
          await page.locator('main').waitFor({ state: 'visible', timeout: 10_000 })
          const actualPath = new URL(page.url()).pathname
          if (actualPath !== route) {
            throw new Error(`Route redirected to ${actualPath || '/'}`)
          }
          await page.waitForTimeout(900)
          const filePath = path.join(
            outputDirectory,
            `${account.role}-${name}.png`,
          )
          await page.screenshot({
            path: filePath,
            fullPage: true,
            animations: 'disabled',
          })
          console.log(`Captured ${account.role}: ${route} -> ${filePath}`)
        } catch (error) {
          failures.push(`${account.role} ${route}: ${error.message}`)
          console.error(`Skipped ${account.role} ${route}: ${error.message}`)
        }
      }

      if (account.role === 'student') {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
        await page.locator('main').waitFor({ state: 'visible', timeout: 10_000 })
        await page.waitForTimeout(900)
        const filePath = path.join(outputDirectory, 'student-dashboard-mobile.png')
        await page.screenshot({
          path: filePath,
          fullPage: true,
          animations: 'disabled',
        })
        console.log(`Captured student mobile dashboard -> ${filePath}`)
      }
    } catch (error) {
      failures.push(`${account.role} login: ${error.message}`)
      console.error(`Could not capture ${account.role}: ${error.message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error('\nScreenshot capture finished with issues:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`\nScreenshot capture completed. Output: ${outputDirectory}`)
}
