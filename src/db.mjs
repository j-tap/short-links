import path from 'path'
import { fileURLToPath } from 'url'
import { Sequelize } from 'sequelize'
import { defineLink } from './models.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Sequelize({
    dialect: 'sqlite',
    host: 'localhost',
    storage: path.join(__dirname, 'database.sqlite'),
})

db.op = Sequelize.Op

const Link = defineLink(db)

db.sync().then(() => console.log('DB is ready'))

function migrate () {
    Link.sync({ alter: true })
}

export {
    db,
    Link,
    migrate,
}
