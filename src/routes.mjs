import express from 'express'
import { rateLimit } from 'express-rate-limit'
import path from 'path'
import { createUniqueLink, getLinkByCode, getShortLinkFromItem, linkViewsInc, show404Page } from './methods.mjs'

const { LIMIT_SECONDS } = process.env
const router = express.Router()

const limiter = rateLimit({
    windowMs: LIMIT_SECONDS * 1000,
    max: 1,
    message: 'Too many requests, try again later'
})

router.use('/short', limiter)

router.get('/', (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
})

router.post('/short', async (req, res) => {
    const { link } = req.body

    if (link) {
        try {
            const item = await createUniqueLink(link)
            res.json({ short: getShortLinkFromItem(item) })
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    else {
        res.status(404).json({ error: 'Link not provided' })
    }
})

router.get('/:code', async (req, res) => {
    const { code } = req.params
    const item = await getLinkByCode(code)

    if (item?.link) {
        linkViewsInc(item)
        res.redirect(item.link)
    }
    else {
        show404Page(res)
    }
})

// Другие маршруты...

export default router;
