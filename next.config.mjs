import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const nextConfig = { output: 'standalone', serverExternalPackages: ['nodemailer', 'geoip-lite'] }
export default withNextIntl(nextConfig)
