import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

// Languages whose speakers should get Russian UI + RUB pricing
const CIS_LANGS = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'az', 'hy', 'ka', 'tk']);

export type Locale = 'ru' | 'en';
export const locales: Locale[] = ['ru', 'en'];
export const defaultLocale: Locale = 'en';

export async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const saved = cookieStore.get('NEXT_LOCALE')?.value;
  if (saved === 'ru' || saved === 'en') return saved;

  const headersList = await headers();

  // travellm.world is English-first
  const host = headersList.get('host') ?? '';
  if (host === 'travellm.world' || host.endsWith('.travellm.world')) return 'en';

  const acceptLang = headersList.get('accept-language') ?? '';
  const primary = acceptLang.split(',')[0]?.split(';')[0]?.trim()?.toLowerCase()?.split('-')[0] ?? '';
  if (CIS_LANGS.has(primary)) return 'ru';

  // .ru domain → Russian by default
  return host.endsWith('.ru') ? 'ru' : 'en';
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
