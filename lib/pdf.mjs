// Extract text from a PDF in the browser with pdf.js (pdfjs-dist).
// The PDF is read locally and is never uploaded anywhere.

export class PdfReadError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PdfReadError'
  }
}

let pdfjsPromise

function loadPdfjs() {
  // Imported on demand: pdf.js needs browser APIs, so it must not load during the static prerender.
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    return pdfjs
  })
  return pdfjsPromise
}

/** Returns { text, pages }. Throws PdfReadError with a message suitable for the visitor. */
export async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer())
  const head = new TextDecoder('latin1').decode(data.subarray(0, 1024))
  if (!head.includes('%PDF-')) throw new PdfReadError('That file does not look like a PDF.')

  const pdfjs = await loadPdfjs()
  let doc
  try {
    doc = await pdfjs.getDocument({ data, useWasm: false, disableFontFace: true, verbosity: 0 }).promise
  } catch (e) {
    if (e?.name === 'PasswordException') {
      throw new PdfReadError('This PDF is password-protected. Remove the password and try again.')
    }
    throw new PdfReadError('Could not read this PDF. It may be damaged.')
  }

  try {
    const pages = []
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''))
      page.cleanup()
    }
    return { text: pages.join('\n'), pages: doc.numPages }
  } finally {
    await doc.destroy()
  }
}
