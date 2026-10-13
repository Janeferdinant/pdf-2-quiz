// Next.js config: a fully static export (out/) with no server code, so any static host can serve it.
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
}

module.exports = nextConfig
