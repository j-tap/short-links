import path from 'path'
import { Sequelize } from 'sequelize'
import { defineLink } from './models.mjs'

const db = new Sequelize({
    dialect: 'sqlite',
    host: 'localhost',
    storage: path.resolve('../database.sqlite'),
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
