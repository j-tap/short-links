import fs from 'fs'
import express from 'express'
import https from 'https'
import http from 'http'
import 'dotenv/config'
import packageJson from './package.json' assert { type: 'json' }
import routes from './routes.mjs'
import { show404Page } from './methods.mjs'

const app = express()
const { PORT, NODE_ENV, SSL_KEY_PATH, SSL_CERT_PATH } = process.env
let server

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/public', express.static('public'))

if (NODE_ENV === 'production') {
    const privateKey = fs.readFileSync(SSL_KEY_PATH, 'utf8')
    const certificate = fs.readFileSync(SSL_CERT_PATH, 'utf8')
    server = https.createServer({ key: privateKey, cert: certificate }, app)
}
else {
    server = http.createServer(app)
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${packageJson.name} running on port ${PORT} (${NODE_ENV === 'production' ? 'https' : 'http'})`)
})

app.use(routes)

app.use((req, res, next) => {
    show404Page(res)
})
