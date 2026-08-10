import { fileURLToPath } from 'url'
import { Sequelize } from 'sequelize'
import { defineLink } from './models.mjs'

// Путь считается от файла, а не от cwd: иначе в контейнере (WORKDIR /app)
// база оказывалась в /database.sqlite мимо тома, смонтированного в /app/database.sqlite,
// и пропадала при каждой пересборке
const db = new Sequelize({
    dialect: 'sqlite',
    host: 'localhost',
    storage: fileURLToPath(new URL('../database.sqlite', import.meta.url)),
})

db.op = Sequelize.Op

const Link = defineLink(db)

// alter: true доносит новые колонки (is_blocked, is_suspicious, checked_at)
// в уже существующую базу — без этого старая таблица останется без них
db.sync({ alter: true })
    .then(() => console.log('DB is ready'))
    .catch((error) => console.error('DB sync error:', error.message))

function migrate () {
    Link.sync({ alter: true })
}

export {
    db,
    Link,
    migrate,
}
