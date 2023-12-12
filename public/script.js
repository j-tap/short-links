const delayNotify = 2500
let eForm = null
let eNotify = null
let eFieldLink = null
let eBtnSubmit = null
let eBtnCopy = null
let isCopied = false

document.addEventListener('DOMContentLoaded', () => {
    eForm = document.getElementById('form')
    eNotify = document.getElementById('form-notify')
    eFieldLink = document.getElementById('field-link')
    eBtnSubmit = document.getElementById('form-btn-submit')
    eBtnCopy = document.getElementById('form-btn-copy')

    eFieldLink.focus()

    pasteInFieldStart()

    eForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await submit()
    })

    eBtnCopy.addEventListener('click', async (e) => {
        e.preventDefault()
        copy(eFieldLink.value)
    })
})

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        eFieldLink.focus()
        pasteInFieldStart()
    }
    else {
        if (!isCopied) {
            clearField()
        }
    }
})

async function submit () {
    const link = eFieldLink.value
    const resp = await fetch(eForm.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `link=${encodeURIComponent(link)}`,
    })
    const response = await resp.json()
    isCopied = false

    if (resp?.ok && response?.short) {
        eFieldLink.value = response.short
        eBtnSubmit.style.display = 'none'
        eBtnCopy.style.display = 'block'
        copy(response.short)
    }
    else {
        console.error(response.error || 'Unknown error')
    }
}

async function copy (text) {
    try {
        await navigator.clipboard.writeText(text)
        showNotify('Copied!', () => {
            clearField()
        })
        isCopied = true
        return true
    }
    catch (err) {
        console.error('Copy error: ', err)
        return false
    }
}

async function pasteInFieldStart () {
    const text = await navigator.clipboard.readText()

    if (
        text
        && text.includes('http')
        && !text.includes(window.location.host)
    ) {
        eFieldLink.value = text
    }
}

function clearField () {
    eFieldLink.value = null
    eBtnSubmit.style.display = 'block'
    eBtnCopy.style.display = 'none'
}

function showNotify (text, fn = () => {}) {
    eNotify.textContent = text
    eNotify.style.display = 'block'

    setTimeout(() => {
        eNotify.style.display = 'none'
        fn()
    }, delayNotify)
}
