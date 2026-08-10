import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.mjs'
import {
    createUniqueLink,
    getLinkByCode,
    getShortLinkFromItem,
    linkViewsInc,
    resolveTarget,
    show404Page,
    showBlockedPage,
    showInterstitial,
} from './methods.mjs'

const router = express.Router()

const limiters = [
    // Антифлуд: не чаще одной ссылки в LIMIT_SECONDS
    rateLimit({
        windowMs: config.limitSeconds * 1000,
        max: 1,
        message: { error: 'Too many requests, try again later' },
    }),
    // Потолки против массовой генерации фишинговых ссылок с одного IP
    rateLimit({
        windowMs: 60 * 60 * 1000,
        max: config.createPerHour,
        message: { error: 'Hourly limit reached, try again later' },
    }),
    rateLimit({
        windowMs: 24 * 60 * 60 * 1000,
        max: config.createPerDay,
        message: { error: 'Daily limit reached, try again tomorrow' },
    }),
]

// Перебор шестизначных кодов чужих ссылок
const resolveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many requests, try again later',
})

router.get('/', (req, res) => {
    res.sendFile(new URL('./public/index.html', import.meta.url).pathname)
})

// Короткие ссылки не должны индексироваться: иначе домен попадает
// в поисковую выдачу вместе с целями редиректов
router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\nAllow: /$\n')
})

router.post('/short', limiters, async (req, res) => {
    const { link } = req.body

    try {
        const result = await createUniqueLink(link)

        if (!result.ok) {
            return res.status(result.status).json({ error: result.error })
        }

        res.json({ short: getShortLinkFromItem(result.item) })
    }
    catch (error) {
        console.error('Create link error:', error)
        res.status(500).json({ error: 'Could not create the link' })
    }
})

router.get('/:code', resolveLimiter, async (req, res) => {
    const { code } = req.params

    if (!/^[a-z0-9]{4,16}$/i.test(code)) return show404Page(res)

    const item = await getLinkByCode(code)

    if (!item?.link) return show404Page(res)

    const target = await resolveTarget(item)

    if (target.action === 'blocked') return showBlockedPage(res)

    linkViewsInc(item)

    if (target.action === 'warn') return showInterstitial(res, target.url, target.flags)

    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.set('Referrer-Policy', 'no-referrer')
    res.redirect(302, target.url)
})

export default router;
