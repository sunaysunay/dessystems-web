import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(en|nl|de|fr|tr|ro|bg|el|es|it)/:path*']
};
