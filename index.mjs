import fs from 'fs'
import path from 'path'
import express from 'express'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import packageJson from './package.json' assert { type: 'json' }
import { Link } from './db.mjs'
import { generateShortCode } from './utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const { PORT, ORIGIN, NODE_ENV, SSL_KEY_PATH, SSL_CERT_PATH } = process.env
let server

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (NODE_ENV === 'production') {
    const privateKey = fs.readFileSync(SSL_KEY_PATH, 'utf8')
    const certificate = fs.readFileSync(SSL_CERT_PATH, 'utf8')
    server = https.createServer({ key: privateKey, cert: certificate }, app)
}
else {
    server = http.createServer(app)
}

server.listen(PORT, () => {
    console.log(`Server ${packageJson.name} running on port ${PORT} (${NODE_ENV === 'production' ? 'https' : 'http'})`)
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.post('/short', async (req, res) => {
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

app.get('/:code', async (req, res) => {
    const { code } = req.params
    const item = await getLinkByCode(code)

    if (item?.link) {
        res.redirect(item.link)
    }
    else {
        res.sendStatus(404)
    }
})

async function createUniqueLink (link = '') {
    let unique = false
    let code

    while (!unique) {
        code = generateShortCode(link)
        const item = await getLinkByCode(code)

        if (item === null) {
            unique = true
        }
    }

    return await Link.create({ link, code })
}

function getShortLinkFromItem ({ code }) {
    return `${ORIGIN}/${code}`
}

async function getLinkByCode (code) {
    return await Link.findOne({ where: { code } })
}
