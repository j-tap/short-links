import net from 'net'
import { config } from './config.mjs'
import { isBlockedDomain } from './blocklist.mjs'

// TLD, которые не резолвятся в публичном интернете или зарезервированы
const RESERVED_TLD = new Set([
    'local', 'localhost', 'internal', 'intranet', 'lan', 'home', 'corp',
    'test', 'invalid', 'example', 'onion', 'i2p',
])

// Чужие сокращатели: цепочка редиректов прячет реальную цель, помечаем как подозрительное
const SHORTENER_HOSTS = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
    'cutt.ly', 'rebrand.ly', 'shorturl.at', 'clck.ru', 'vk.cc', 'clc.to',
    't.me', 'surl.li', 'u.to', 'qr.ae', 'rb.gy', 'shorte.st', 'adf.ly',
])

export const REASON = {
    EMPTY: 'Link not provided',
    TOO_LONG: `URL is longer than ${config.maxUrlLength} characters`,
    MALFORMED: 'Not a valid URL',
    BAD_SCHEME: 'Only http:// and https:// links are allowed',
    CREDENTIALS: 'URLs with embedded credentials are not allowed',
    NO_TLD: 'Hostname must be a public domain name',
    RESERVED_TLD: 'This top-level domain is not publicly routable',
    PRIVATE_HOST: 'Links to local or private network addresses are not allowed',
    NUMERIC_HOST: 'Obfuscated numeric hostnames are not allowed',
    SELF: 'Links to this service itself are not allowed',
    BLOCKED: 'This domain is blocked',
}

export const FLAG = {
    RAW_IP: 'target is a raw IP address',
    PUNYCODE: 'internationalized domain (possible look-alike)',
    SHORTENER: 'target is another URL shortener',
    NO_TLS: 'target does not use https',
    DEEP_SUBDOMAIN: 'unusually deep subdomain chain',
}

/**
 * Разбор пользовательского ввода. Схема добавляется только когда её нет вовсе,
 * поэтому javascript:, data:, file: и прочее сюда не проскакивают.
 */
function parseUrl (raw) {
    const value = raw.trim()

    if (/^https?:\/\//i.test(value)) return new URL(value)
    // Уже есть какая-то другая схема — она не поддерживается
    if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(value)) throw new Error(REASON.BAD_SCHEME)
    if (value.startsWith('//')) throw new Error(REASON.BAD_SCHEME)

    return new URL(`https://${value}`)
}

function isPrivateIp (ip) {
    const version = net.isIP(ip)

    if (version === 4) {
        const [a, b] = ip.split('.').map(Number)

        return a === 0 // 0.0.0.0/8
            || a === 10 // частная сеть
            || a === 127 // loopback
            || (a === 100 && b >= 64 && b <= 127) // CGNAT
            || (a === 169 && b === 254) // link-local
            || (a === 172 && b >= 16 && b <= 31) // частная сеть
            || (a === 192 && b === 168) // частная сеть
            || (a === 192 && b === 0) // IETF protocol assignments
            || (a === 198 && (b === 18 || b === 19)) // benchmarking
            || a >= 224 // multicast и зарезервированное
    }

    if (version === 6) {
        const value = ip.toLowerCase()

        return value === '::' || value === '::1'
            || value.startsWith('fc') || value.startsWith('fd') // unique local
            || value.startsWith('fe80') // link-local
            || value.startsWith('::ffff:') // IPv4-mapped
    }

    return false
}

/**
 * Проверяет ссылку и возвращает нормализованный URL с набором флагов.
 * @returns {{ ok: true, url: string, hostname: string, flags: string[] }
 *          | { ok: false, reason: string }}
 */
export function inspectUrl (raw) {
    if (typeof raw !== 'string' || !raw.trim()) {
        return { ok: false, reason: REASON.EMPTY }
    }
    if (raw.length > config.maxUrlLength) {
        return { ok: false, reason: REASON.TOO_LONG }
    }

    let url

    try {
        url = parseUrl(raw)
    }
    catch (error) {
        return { ok: false, reason: error.message === REASON.BAD_SCHEME ? REASON.BAD_SCHEME : REASON.MALFORMED }
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { ok: false, reason: REASON.BAD_SCHEME }
    }
    // https://paypal.com@evil.example — классическая маскировка
    if (url.username || url.password) {
        return { ok: false, reason: REASON.CREDENTIALS }
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')

    if (!hostname) return { ok: false, reason: REASON.MALFORMED }

    const flags = []
    const isIp = net.isIP(hostname) !== 0

    if (isIp) {
        if (isPrivateIp(hostname)) return { ok: false, reason: REASON.PRIVATE_HOST }
        flags.push(FLAG.RAW_IP)
    }
    else {
        // http://2130706433/ и http://0x7f000001/ браузер резолвит как 127.0.0.1
        if (/^(\d+|0x[0-9a-f]+)$/i.test(hostname)) {
            return { ok: false, reason: REASON.NUMERIC_HOST }
        }

        const labels = hostname.split('.')
        const tld = labels[labels.length - 1]

        if (labels.length < 2 || !tld) return { ok: false, reason: REASON.NO_TLD }
        if (RESERVED_TLD.has(tld)) return { ok: false, reason: REASON.RESERVED_TLD }
        if (!/^[a-z]{2,}$/.test(tld) && !tld.startsWith('xn--')) {
            return { ok: false, reason: REASON.NO_TLD }
        }

        if (labels.some((label) => label.startsWith('xn--'))) flags.push(FLAG.PUNYCODE)
        // Порог с запасом: sub.domain.example.co.uk (5) легитимен,
        // а secure.paypal.com.login.evil.example (6) — типичная маскировка
        if (labels.length > 5) flags.push(FLAG.DEEP_SUBDOMAIN)

        const registrable = labels.slice(-2).join('.')

        if (SHORTENER_HOSTS.has(hostname) || SHORTENER_HOSTS.has(registrable)) {
            flags.push(FLAG.SHORTENER)
        }
    }

    if (config.selfHosts.includes(hostname)) return { ok: false, reason: REASON.SELF }
    if (isBlockedDomain(hostname)) return { ok: false, reason: REASON.BLOCKED }

    if (url.protocol === 'http:') flags.push(FLAG.NO_TLS)

    return { ok: true, url: url.toString(), hostname, flags }
}

// Отсутствие https само по себе не повод показывать предупреждение —
// иначе интерстишиал вылезал бы на половине легитимных старых сайтов
const INTERSTITIAL_FLAGS = new Set([
    FLAG.RAW_IP,
    FLAG.PUNYCODE,
    FLAG.SHORTENER,
    FLAG.DEEP_SUBDOMAIN,
])

export function isSuspicious (flags = []) {
    return flags.some((flag) => INTERSTITIAL_FLAGS.has(flag))
}
