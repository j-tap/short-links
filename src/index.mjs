import express from 'express'
import 'dotenv/config'
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

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`)
})
