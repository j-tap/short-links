import express from 'express'
import 'dotenv/config'
import packageJson from './package.json' assert { type: 'json' }
import routes from './routes.mjs'
import { show404Page } from './methods.mjs'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/public', express.static('public'))

app.use(routes)

app.use((req, res) => {
    show404Page(res)
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server "${packageJson.name}" running on port ${PORT}`)
})
