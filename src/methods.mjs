import path from 'path'
import { generateShortCode } from './utils.mjs'
import { Link } from './db.mjs'

const { ORIGIN } = process.env

export function show404Page (res) {
    res.status(404).sendFile(new URL('./public/error404.html', import.meta.url).pathname)
}

export async function createUniqueLink (link = '') {
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

export function getShortLinkFromItem ({ code }) {
    return `${ORIGIN}/${code}`
}

export async function getLinkByCode (code) {
    return await Link.findOne({ where: { code } })
}

export function linkViewsInc (item) {
    const id = item.id
    const count_views = item.count_views + 1

    Link.update({ count_views }, { where: { id } })
}
