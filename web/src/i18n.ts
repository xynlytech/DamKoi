import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a Promise<string | undefined> in next-intl v4
  let locale = await requestLocale;

  // Fall back to defaultLocale if not valid
  if (!locale || !routing.locales.includes(locale as 'en' | 'bn')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
