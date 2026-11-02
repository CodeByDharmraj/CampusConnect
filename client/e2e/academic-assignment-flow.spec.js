import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const facultyEmail = process.env.E2E_FACULTY_EMAIL
const facultyPassword = process.env.E2E_FACULTY_PASSWORD
const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD

async function signIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('College email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('Academic assignment lifecycle', () => {
  test.skip(
    !facultyEmail || !facultyPassword || !studentEmail || !studentPassword,
    'Set E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD, E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD to use dedicated seeded test accounts.',
  )

  test('faculty publishes, student submits, and faculty grades an assignment', async ({ browser }) => {
    const unique = new Date().toISOString().replace(/[:.]/g, '-')
    const assignmentTitle = `E2E Academic Workflow ${unique}`
    const feedbackText = `E2E feedback ${unique}`

    // Faculty creates and publishes an assignment for an already assigned course.
    const facultyContext = await browser.newContext()
    const facultyPage = await facultyContext.newPage()
    await signIn(facultyPage, facultyEmail, facultyPassword)
    await facultyPage.goto('/assignment-management')
    await expect(facultyPage.getByRole('heading', { name: 'Assignment Management' })).toBeVisible()

    const courseSelect = facultyPage.getByLabel('Course offering')
    await expect(courseSelect).toBeVisible()
    await expect(courseSelect.locator('option').nth(1)).toBeAttached()
    await courseSelect.selectOption({ index: 1 })
    await facultyPage.getByLabel('Assignment title').fill(assignmentTitle)
    await facultyPage.getByLabel('Description').fill('Complete the E2E workflow assignment and upload your solution.')
    await facultyPage.getByLabel('Instructions').fill('Upload the provided PDF file before the deadline.')

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const localDueDate = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16)
    await facultyPage.getByLabel('Submission deadline').fill(localDueDate)
    await facultyPage.getByRole('button', { name: 'Save draft' }).click()
    await expect(facultyPage.getByText(assignmentTitle, { exact: true })).toBeVisible()
    facultyPage.once('dialog', (dialog) => dialog.accept())
    const assignmentCard = facultyPage.getByText(assignmentTitle, { exact: true }).locator(
      'xpath=ancestor::*[.//button[normalize-space()="Publish"]][1]',
    )
    await assignmentCard.getByRole('button', { name: 'Publish' }).click()
    await expect(facultyPage.getByRole('status').filter({ hasText: 'Assignment published successfully.' })).toBeVisible()

    // Student uploads a real PDF through the application's signed-upload flow.
    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    await signIn(studentPage, studentEmail, studentPassword)
    await studentPage.goto('/submissions')
    await expect(studentPage.getByRole('heading', { name: 'My Submissions' })).toBeVisible()
    const assignmentCardForStudent = studentPage.getByText(assignmentTitle, { exact: true }).locator(
      'xpath=ancestor::*[.//input[@type="file"]][1]',
    )
    await expect(assignmentCardForStudent).toBeVisible()
    await assignmentCardForStudent.getByLabel('Choose your file').setInputFiles(
      path.join(here, 'fixtures', 'academic-workflow.pdf'),
    )
    await assignmentCardForStudent.getByRole('button', { name: 'Submit assignment' }).click()
    await expect(studentPage.getByText('Your assignment was submitted successfully.')).toBeVisible({ timeout: 45_000 })

    // Faculty reviews the submitted work and records a grade plus feedback.
    await facultyPage.goto('/submissions')
    await expect(facultyPage.getByRole('heading', { name: 'Submission Review' })).toBeVisible()
    const assignmentPicker = facultyPage.locator('select').first()
    const matchingOption = assignmentPicker.locator('option').filter({ hasText: assignmentTitle })
    await expect(matchingOption).toHaveCount(1)
    await assignmentPicker.selectOption(await matchingOption.getAttribute('value'))
    await expect(facultyPage.getByText(studentEmail)).toBeVisible()
    await facultyPage.getByLabel('Grade (out of 100)').fill('92')
    await facultyPage.getByLabel('Feedback').fill(feedbackText)
    await facultyPage.getByRole('button', { name: 'Save evaluation' }).click()
    await expect(facultyPage.getByRole('status').filter({ hasText: 'Submission evaluation saved successfully.' })).toBeVisible()

    // Student can see the persisted evaluation after a fresh page load.
    await studentPage.reload()
    await expect(studentPage.getByText('Grade: 92 / 100')).toBeVisible()
    await expect(studentPage.getByText(feedbackText)).toBeVisible()

    await studentContext.close()
    await facultyContext.close()
  })
})
