import fs from 'fs'
import { generateShortCode } from './utils.mjs'
import { Link } from './db.mjs'
import { config } from './config.mjs'
import { inspectUrl, isSuspicious } from './urlGuard.mjs'
import { lookupThreat } from './safeBrowsing.mjs'

const views = {
    interstitial: fs.readFileSync(new URL('./views/interstitial.html', import.meta.url), 'utf8'),
    blocked: fs.readFileSync(new URL('./views/blocked.html', import.meta.url), 'utf8'),
}

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml (value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}

/** Ни одна страница редиректа не должна попадать в поисковый индекс и утекать реферером */
function noIndex (res) {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.set('Referrer-Policy', 'no-referrer')
    return res
}

export function show404Page (res) {
    noIndex(res).status(404).sendFile(new URL('./public/error404.html', import.meta.url).pathname)
}

export function showBlockedPage (res) {
    noIndex(res).status(403).type('html').send(views.blocked)
}

export function showInterstitial (res, url, flags = []) {
    const reasons = flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join('')
    const html = views.interstitial
        .replaceAll('{{URL_ATTR}}', escapeHtml(url))
        .replaceAll('{{URL}}', escapeHtml(url))
        .replaceAll('{{REASONS}}', reasons)

    noIndex(res).status(200).type('html').send(html)
}

/**
 * Проверяет ссылку и сохраняет её.
 * @returns {Promise<{ ok: true, item: object } | { ok: false, status: number, error: string }>}
 */
export async function createUniqueLink (rawLink = '') {
    const verdict = inspectUrl(rawLink)

    if (!verdict.ok) {
        return { ok: false, status: 400, error: verdict.reason }
    }

    const threat = await lookupThreat(verdict.url)

    if (threat) {
        console.warn(`Rejected ${verdict.hostname}: Safe Browsing reported ${threat}`)
        return { ok: false, status: 403, error: 'This link was reported as unsafe and cannot be shortened' }
    }

    let code

    do {
        code = generateShortCode(verdict.url)
    }
    while (await getLinkByCode(code) !== null)

    const item = await Link.create({
        link: verdict.url,
        code,
        is_blocked: false,
        is_suspicious: isSuspicious(verdict.flags),
        checked_at: new Date(),
    })

    return { ok: true, item }
}

export function getShortLinkFromItem ({ code }) {
    return `${config.origin}/${code}`
}

export async function getLinkByCode (code) {
    return await Link.findOne({ where: { code } })
}

export function linkViewsInc (item) {
    Link.update({ count_views: Number(item.count_views) + 1 }, { where: { id: item.id } })
        .catch((error) => console.error('View counter error:', error.message))
}

/**
 * Решает, что делать с сохранённой ссылкой при переходе.
 *
 * Проверка повторяется на каждом переходе, а не только при создании:
 * в базе лежат записи, созданные до появления валидации, а цель ссылки
 * может стать вредоносной уже после сокращения.
 *
 * @returns {Promise<{ action: 'redirect'|'warn'|'blocked', url?: string, flags?: string[] }>}
 */
export async function resolveTarget (item) {
    if (item.is_blocked) return { action: 'blocked' }

    const verdict = inspectUrl(item.link)

    if (!verdict.ok) {
        await item.update({ is_blocked: true }).catch(() => {})
        console.warn(`Blocked stored link ${item.code}: ${verdict.reason}`)
        return { action: 'blocked' }
    }

    const staleAfter = config.recheckHours * 60 * 60 * 1000
    const isStale = !item.checked_at || Date.now() - new Date(item.checked_at).getTime() > staleAfter

    if (isStale) {
        const threat = await lookupThreat(verdict.url)

        if (threat) {
            await item.update({ is_blocked: true, checked_at: new Date() }).catch(() => {})
            console.warn(`Blocked ${item.code} (${verdict.hostname}): Safe Browsing reported ${threat}`)
            return { action: 'blocked' }
        }

        await item.update({ checked_at: new Date() }).catch(() => {})
    }

    if (item.is_suspicious || isSuspicious(verdict.flags)) {
        return { action: 'warn', url: verdict.url, flags: verdict.flags }
    }

    return { action: 'redirect', url: verdict.url }
}
