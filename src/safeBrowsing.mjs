import { config } from './config.mjs'

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'
const TIMEOUT_MS = 4000
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX = 5000

const cache = new Map()

export const isEnabled = Boolean(config.safeBrowsingKey)

function readCache (url) {
    const hit = cache.get(url)

    if (!hit) return undefined
    if (Date.now() - hit.at > CACHE_TTL_MS) {
        cache.delete(url)
        return undefined
    }

    return hit.threat
}

function writeCache (url, threat) {
    if (cache.size >= CACHE_MAX) cache.clear()
    cache.set(url, { threat, at: Date.now() })
}

/**
 * Проверка ссылки в Google Safe Browsing.
 * @returns {Promise<string|null>} тип угрозы или null, если чисто / проверка недоступна
 *
 * Fail-open: при сетевой ошибке или недоступности API ссылка не блокируется,
 * иначе падение стороннего сервиса роняет весь сервис.
 */
export async function lookupThreat (url) {
    if (!isEnabled) return null

    const cached = readCache(url)

    if (cached !== undefined) return cached

    const body = {
        client: { clientId: 'short-links', clientVersion: '1.0.0' },
        threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
        },
    }

    try {
        const resp = await fetch(`${ENDPOINT}?key=${encodeURIComponent(config.safeBrowsingKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })

        if (!resp.ok) {
            console.error(`Safe Browsing responded ${resp.status}`)
            return null
        }

        const data = await resp.json()
        const threat = data?.matches?.[0]?.threatType || null

        writeCache(url, threat)

        return threat
    }
    catch (error) {
        console.error('Safe Browsing check failed:', error.message)
        return null
    }
}
