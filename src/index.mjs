import express from 'express'
import { config } from './config.mjs'
import routes from './routes.mjs'
import { show404Page } from './methods.mjs'
import { isEnabled as safeBrowsingEnabled } from './safeBrowsing.mjs'

const app = express()

// За Traefik реальный IP приходит в X-Forwarded-For.
// Без этого rate limit считает все запросы как один IP прокси.
app.set('trust proxy', config.trustProxy)
app.disable('x-powered-by')

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('X-Frame-Options', 'DENY')
    next()
})

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use('/public', express.static(new URL('./public', import.meta.url).pathname))

app.use(routes)

app.use((req, res) => {
    show404Page(res)
})

app.listen(config.port, () => {
    console.log(`Listening at http://localhost:${config.port}`)
    console.log(`Safe Browsing check: ${safeBrowsingEnabled ? 'enabled' : 'disabled (no SAFE_BROWSING_API_KEY)'}`)
})
