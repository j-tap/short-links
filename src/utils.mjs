import crypto from 'crypto'

export  function generateShortCode (link = '') {
    const dt = new Date().getTime().toString()
    const token = crypto.randomBytes(8).toString('hex')
    const hash = crypto.createHash('md5').update(link + token + dt).digest('hex')
    return hash.substring(0, 6)
}
