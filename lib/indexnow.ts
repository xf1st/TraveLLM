/**
 * IndexNow — мгновенное уведомление Яндекса (и других поисковиков)
 * о новых / изменённых / удалённых страницах.
 *
 * Документация: https://yandex.com/support/webmaster/indexnow/key.html
 *
 * Ключ (INDEXNOW_KEY) должен совпадать с содержимым файла
 * /public/{INDEXNOW_KEY}.txt, который хостится на сайте.
 */

const INDEXNOW_ENDPOINT = 'https://yandex.com/indexnow'

/**
 * Отправить один URL.
 * host — домен без протокола (travellm.ru или travellm.world).
 */
export async function notifyIndexNow(url: string, host?: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  if (!key) return

  const resolvedHost = host ?? new URL(url).hostname
  const keyLocation = `https://${resolvedHost}/${key}.txt`

  const endpoint = `${INDEXNOW_ENDPOINT}?url=${encodeURIComponent(url)}&key=${key}&keyLocation=${encodeURIComponent(keyLocation)}`

  try {
    const res = await fetch(endpoint, { method: 'GET', cache: 'no-store' })
    if (!res.ok && res.status !== 202) {
      console.warn('[IndexNow] unexpected status', res.status, url)
    }
  } catch (err) {
    console.warn('[IndexNow] fetch error', err)
  }
}

/**
 * Отправить несколько URL за один запрос (POST).
 * Все URL должны принадлежать одному хосту.
 */
export async function notifyIndexNowBatch(urls: string[], host: string): Promise<void> {
  if (urls.length === 0) return

  const key = process.env.INDEXNOW_KEY
  if (!key) return

  const keyLocation = `https://${host}/${key}.txt`

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
      cache: 'no-store',
    })
    if (!res.ok && res.status !== 202) {
      console.warn('[IndexNow] batch unexpected status', res.status, urls.length, 'URLs')
    }
  } catch (err) {
    console.warn('[IndexNow] batch fetch error', err)
  }
}
