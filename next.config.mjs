import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['nodemailer', 'geoip-lite', 'pg', 'libpg-query'],
  async rewrites() {
    return [
      { source: '/solutions/demos/:demo', destination: '/solutions/demos/:demo/index.html' },
      { source: '/solutions/demos/:demo/:sub', destination: '/solutions/demos/:demo/:sub/index.html' },
    ]
  },
}
export default withNextIntl(nextConfig)
