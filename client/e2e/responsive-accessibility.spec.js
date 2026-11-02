import { expect, test } from '@playwright/test'

const viewportWidths = [320, 375, 768, 1024, 1440]

test.describe('Phase 54 — responsive and accessibility regression', () => {
  for (const width of viewportWidths) {
    test(`login layout has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/login')

      await expect(
        page.getByRole('heading', { name: 'Sign in', level: 1 }),
      ).toBeVisible()
      await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content')
      await expect(page.getByLabel('College email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        root: document.getElementById('root')?.scrollWidth ?? 0,
      }))

      expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.viewport,
      )
      expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.viewport,
      )
      expect(dimensions.root, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.viewport,
      )
    })
  }

  test('skip link is keyboard accessible and moves focus to main content', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/login')

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('main')).toBeFocused()
  })

  test('login fields expose labels and announce validation errors', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')

    const email = page.getByLabel('College email')
    const password = page.getByLabel('Password')

    await expect(email).toHaveAttribute('type', 'email')
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#login-email-error')).toHaveText(
      'Enter your email address.',
    )
    await expect(page.locator('#login-password-error')).toHaveText(
      'Enter your password.',
    )
  })

  test('mobile navigation supports focus management, Escape, and focus restoration', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')

    const trigger = page.getByRole('button', { name: 'Open navigation menu' })
    await expect(trigger).toBeVisible()
    await trigger.click()

    const drawer = page.getByRole('dialog', { name: 'Mobile navigation' })
    const closeButton = drawer.getByRole('button', {
      name: 'Close navigation menu',
    })

    await expect(drawer).toBeVisible()
    await expect(closeButton).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')

    await expect(drawer).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('mobile navigation keeps keyboard focus inside the open drawer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')

    await page.getByRole('button', { name: 'Open navigation menu' }).click()

    const drawer = page.getByRole('dialog', { name: 'Mobile navigation' })
    const closeButton = drawer.getByRole('button', {
      name: 'Close navigation menu',
    })
    const themeButton = drawer.getByRole('button', {
      name: /switch to (light|dark) mode/i,
    })

    await expect(closeButton).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(themeButton).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused()
  })

  test('interactive controls have accessible names on the login page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/login')

    const unnamedControls = await page.locator('button, input, select, textarea').evaluateAll(
      (elements) =>
        elements
          .filter((element) => {
            if (element.type === 'hidden') return false
            const label =
              element.getAttribute('aria-label') ||
              element.getAttribute('aria-labelledby') ||
              element.labels?.length ||
              element.innerText?.trim()
            return !label
          })
          .map((element) => element.outerHTML),
    )

    expect(unnamedControls).toEqual([])
  })

  test('student dashboard, courses, and events stay within common viewport widths', async ({
    page,
  }) => {
    const email = process.env.E2E_STUDENT_EMAIL
    const password = process.env.E2E_STUDENT_PASSWORD

    test.skip(
      !email || !password,
      'Set dedicated E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD for authenticated responsive coverage.',
    )

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/login')
    await page.getByLabel('College email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })

      for (const route of ['/', '/courses', '/events']) {
        await page.goto(route)
        await expect(page.getByRole('main')).toBeVisible()

        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          root: document.getElementById('root')?.scrollWidth ?? 0,
        }))

        expect(
          dimensions.document,
          `${route} at ${width}px: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.viewport)
        expect(
          dimensions.body,
          `${route} at ${width}px: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.viewport)
        expect(
          dimensions.root,
          `${route} at ${width}px: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.viewport)
      }
    }
  })

})
