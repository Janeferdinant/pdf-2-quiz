// End-to-end test on the exported static site. The Gemini request is intercepted and answered
// with a mock, and every other external request is blocked, so the real API is never called.
import { test, expect } from '@playwright/test'

const FAKE_KEY = 'AIzaFAKE-key-for-tests-only-0123456789'

// Builds a small valid one-page PDF with a correct xref table.
function makePdf(lines) {
  const stream = 'BT /F1 14 Tf 40 760 Td 18 TL ' + lines.map((l) => `(${l}) Tj T*`).join(' ') + ' ET'
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

const pdf = makePdf([
  'Photosynthesis is the process plants use to make food from light.',
  'Chlorophyll is the green pigment that absorbs light.',
  'Photosynthesis releases oxygen as a by-product.',
])

// Mocked Gemini reply: T/F as numeric 0 (= True), MCQ answered with option text, T/F as the word "false".
const mockReply = {
  questions: [
    { type: 'true_false', question: 'Photosynthesis releases oxygen.', options: ['True', 'False'], answer: 0, explanation: 'Oxygen is a by-product.' },
    { type: 'multiple_choice', question: 'Which pigment absorbs light in plants?', options: ['Haemoglobin', 'Chlorophyll', 'Melanin', 'Keratin'], answer: 'Chlorophyll', explanation: 'Chlorophyll absorbs light.' },
    { type: 'true_false', question: 'Plants make food in their roots.', options: ['True', 'False'], answer: 'false', explanation: 'Leaves do it.' },
  ],
}

async function setup(page) {
  const geminiRequests = []
  const blocked = []
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname === 'generativelanguage.googleapis.com') {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      geminiRequests.push({ url: route.request().url(), headers: route.request().headers(), body: route.request().postData() })
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(mockReply) }] }, finishReason: 'STOP' }] }),
      })
    }
    blocked.push(route.request().url())
    return route.abort()
  })
  return { geminiRequests, blocked }
}

async function openSetup(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('heading', { name: 'Quiz setup' })).toBeVisible()
}

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test('upload a PDF, generate questions, take the quiz and check the answer key', async ({ page }, info) => {
  const { geminiRequests, blocked } = await setup(page)
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))

  await openSetup(page)
  await noHorizontalScroll(page)
  await expect(page.getByTestId('key-notice')).toContainText('stays in this browser')
  await expect(page.getByTestId('key-notice')).toContainText('billed to your own Google account')

  await page.getByLabel('Gemini API key').fill(FAKE_KEY)
  await page.locator('#pdf-file').setInputFiles({ name: 'photosynthesis.pdf', mimeType: 'application/pdf', buffer: pdf })
  await page.getByLabel('Difficulty').selectOption('hard')
  await page.getByLabel(/Questions \(1/).fill('3')
  await page.screenshot({ path: `test-results/setup-${info.project.name}.png`, fullPage: true })

  await page.getByRole('button', { name: 'Generate quiz' }).click()
  await expect(page.getByText('Question 1 / 3')).toBeVisible({ timeout: 30000 })
  await noHorizontalScroll(page)

  // The request went to Google's API only, carried the key in the header (not the URL), and the prompt had the difficulty and the PDF text.
  expect(geminiRequests).toHaveLength(1)
  expect(geminiRequests[0].url).toContain('generativelanguage.googleapis.com')
  expect(geminiRequests[0].url).not.toContain(FAKE_KEY)
  expect(geminiRequests[0].headers['x-goog-api-key']).toBe(FAKE_KEY)
  expect(geminiRequests[0].body).toContain('Difficulty: hard')
  expect(geminiRequests[0].body).toContain('Chlorophyll is the green pigment')
  expect(blocked).toEqual([])

  // Answer: True, Chlorophyll (by clicking), then skip the third.
  await page.getByRole('button', { name: 'True', exact: true }).click()
  await page.getByRole('button', { name: 'Chlorophyll' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()

  await expect(page.getByRole('heading', { name: 'Quiz complete' })).toBeVisible()
  await expect(page.getByTestId('score')).toHaveText('2')
  const key = await page.getByTestId('correct-answer').allTextContents()
  expect(key).toEqual(['True', 'Chlorophyll', 'False'])
  await noHorizontalScroll(page)
  await page.screenshot({ path: `test-results/results-${info.project.name}.png`, fullPage: true })

  // The key was not persisted anywhere by default.
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }))
  expect(stored).not.toContain(FAKE_KEY)
  expect(consoleErrors.join('\n')).not.toContain(FAKE_KEY)
  expect(consoleErrors).toEqual([])
})

test('"Remember for this tab" uses sessionStorage only', async ({ page }) => {
  await setup(page)
  await openSetup(page)
  await page.getByLabel('Gemini API key').fill(FAKE_KEY)
  await page.getByLabel(/Remember for this tab/).check()
  const where = await page.evaluate(() => ({ local: JSON.stringify({ ...localStorage }), session: JSON.stringify({ ...sessionStorage }) }))
  expect(where.session).toContain(FAKE_KEY)
  expect(where.local).not.toContain(FAKE_KEY)
  await page.getByLabel(/Remember for this tab/).uncheck()
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(FAKE_KEY)
})

test('shows clear errors for a missing key, a non-PDF, an oversized PDF and a bad question count', async ({ page }) => {
  const { geminiRequests } = await setup(page)
  await openSetup(page)

  await page.getByRole('button', { name: 'Generate quiz' }).click()
  await expect(page.locator('p[role=alert]').first()).toContainText('Paste your Gemini API key')

  await page.getByLabel('Gemini API key').fill(FAKE_KEY)
  await page.locator('#pdf-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.locator('p[role=alert]').first()).toContainText('not a PDF')

  await page.locator('#pdf-file').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 0x20) })
  await expect(page.locator('p[role=alert]').first()).toContainText('limit is 10 MB')

  await page.locator('#pdf-file').setInputFiles({ name: 'ok.pdf', mimeType: 'application/pdf', buffer: pdf })
  await page.getByLabel(/Questions \(1/).fill('51')
  await page.getByRole('button', { name: 'Generate quiz' }).click()
  await expect(page.locator('p[role=alert]').first()).toContainText('between 1 and 50')
  expect(geminiRequests).toHaveLength(0)
})
