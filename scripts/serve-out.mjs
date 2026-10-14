// Tiny static file server for the exported site in out/ (used by the Playwright tests and for local preview).
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const root = resolve('out')
const port = Number(process.env.PORT || 4173)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.wasm': 'application/wasm' }

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    let file = normalize(join(root, p))
    if (file !== root && !file.startsWith(root + sep)) throw new Error('outside root')
    if (!extname(file) && !(await stat(file).catch(() => null))) file += '.html'
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`Serving out/ at http://127.0.0.1:${port}`))
