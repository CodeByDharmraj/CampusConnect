import { test, expect } from '@playwright/test'

const coordinatorEmail = process.env.E2E_COORDINATOR_EMAIL
const coordinatorPassword = process.env.E2E_COORDINATOR_PASSWORD
const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD

async function signIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('College email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

test.describe('Campus event lifecycle', () => {
  test.skip(
    !coordinatorEmail || !coordinatorPassword || !studentEmail || !studentPassword,
    'Set E2E_COORDINATOR_EMAIL, E2E_COORDINATOR_PASSWORD, E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD for dedicated test accounts.',
  )

  test('coordinator publishes an event, student registers, and coordinator records attendance', async ({ browser }) => {
    test.setTimeout(240_000)

    const unique = new Date().toISOString().replace(/[:.]/g, '-')
    const eventTitle = `E2E Campus Event ${unique}`
    const startsAt = new Date(Date.now() + 90_000)
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000)

    const coordinatorContext = await browser.newContext()
    const coordinatorPage = await coordinatorContext.newPage()
    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()

    try {
      // Coordinator creates an event in their department and publishes it.
      await signIn(coordinatorPage, coordinatorEmail, coordinatorPassword)
      await coordinatorPage.goto('/events')
      await expect(coordinatorPage.getByRole('heading', { name: 'Campus Events' })).toBeVisible()
      await coordinatorPage.getByRole('button', { name: 'Create event' }).click()
      await coordinatorPage.getByLabel('Event title').fill(eventTitle)
      await coordinatorPage.getByLabel('Category').selectOption('Technical')

      const clubSelect = coordinatorPage.getByLabel('Organising club')
      await expect(clubSelect.locator('option').nth(1)).toBeAttached()
      await clubSelect.selectOption({ index: 1 })
      await coordinatorPage.getByLabel('Starts at').fill(localDateTime(startsAt))
      await coordinatorPage.getByLabel('Ends at').fill(localDateTime(endsAt))
      await coordinatorPage.getByLabel('Venue').fill('E2E Test Auditorium')
      await coordinatorPage.getByLabel('Capacity').fill('10')
      await coordinatorPage.getByLabel('Description').fill(
        'A dedicated end-to-end test event that validates registration and attendance workflows.',
      )
      await coordinatorPage.getByRole('button', { name: 'Create draft' }).click()
      await expect(coordinatorPage.getByRole('status').filter({ hasText: 'Event draft created successfully.' })).toBeVisible()

      const eventCard = coordinatorPage.getByRole('article').filter({ hasText: eventTitle })
      await expect(eventCard).toBeVisible()
      await eventCard.getByRole('button', { name: 'Publish' }).click()
      await expect(coordinatorPage.getByRole('status').filter({ hasText: 'Event published.' })).toBeVisible()
      await expect(eventCard.getByText('published', { exact: true })).toBeVisible()

      // Student registers while the event's start time is still in the future.
      await signIn(studentPage, studentEmail, studentPassword)
      await studentPage.goto('/events')
      const studentEventCard = studentPage.getByRole('article').filter({ hasText: eventTitle })
      await expect(studentEventCard).toBeVisible()
      await expect(studentEventCard.getByText('Registration is open.')).toBeVisible()
      await studentEventCard.getByRole('button', { name: 'Register for event' }).click()
      await expect(studentPage.getByRole('status').filter({ hasText: 'You are registered for this event.' })).toBeVisible()
      await expect(studentEventCard.getByText('You are registered for this event.')).toBeVisible()

      // Event attendance is intentionally available only after the event starts.
      const waitUntilStart = Math.max(0, startsAt.getTime() - Date.now() + 2_000)
      await coordinatorPage.waitForTimeout(waitUntilStart)
      await coordinatorPage.goto('/events')
      const publishedEventCard = coordinatorPage.getByRole('article').filter({ hasText: eventTitle })
      await publishedEventCard.getByRole('link', { name: 'Manage attendance' }).click()
      await expect(coordinatorPage.getByRole('heading', { name: 'Event Attendance' })).toBeVisible()
      await expect(coordinatorPage.getByText(studentEmail)).toBeVisible()

      const participantRow = coordinatorPage.locator('div.grid').filter({ hasText: studentEmail }).last()
      await participantRow.getByLabel('Attendance status').selectOption('present')
      await coordinatorPage.getByRole('button', { name: 'Save attendance', exact: true }).last().click()
      await expect(coordinatorPage.getByRole('status').filter({ hasText: 'Attendance saved for 1 participant(s).' })).toBeVisible()
      await expect(coordinatorPage.getByText('Present', { exact: true })).toBeVisible()
    } finally {
      await studentContext.close()
      await coordinatorContext.close()
    }
  })
})
