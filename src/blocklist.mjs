import fs from 'fs'

const FILE = new URL('./data/blocklist.txt', import.meta.url)
const RELOAD_INTERVAL_MS = 60 * 1000

let domains = new Set()
let loadedMtime = 0
let lastCheck = 0

function load () {
    try {
        const { mtimeMs } = fs.statSync(FILE)

        if (mtimeMs === loadedMtime) return

        const lines = fs.readFileSync(FILE, 'utf8').split('\n')

        domains = new Set(
            lines
                .map((line) => line.trim().toLowerCase())
                .filter((line) => line && !line.startsWith('#'))
        )
        loadedMtime = mtimeMs
    }
    catch (error) {
        console.error('Blocklist load error:', error.message)
    }
}

load()

/**
 * Домен в блок-листе или любой его родитель:
 * sub.evil.example блокируется правилом evil.example
 */
export function isBlockedDomain (hostname = '') {
    if (Date.now() - lastCheck > RELOAD_INTERVAL_MS) {
        lastCheck = Date.now()
        load()
    }

    if (!domains.size) return false

    const parts = hostname.toLowerCase().split('.')

    for (let i = 0; i < parts.length - 1; i++) {
        if (domains.has(parts.slice(i).join('.'))) return true
    }

    return false
}
