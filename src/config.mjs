import 'dotenv/config'

function num (value, fallback) {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : fallback
}

function hostOf (value) {
    if (!value) return null
    try {
        return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase()
    }
    catch {
        return null
    }
}

const {
    PORT,
    ORIGIN,
    TRAEFIK_DOMAIN,
    LIMIT_SECONDS,
    CREATE_PER_HOUR,
    CREATE_PER_DAY,
    TRUST_PROXY,
    SAFE_BROWSING_API_KEY,
    RECHECK_HOURS,
    MAX_URL_LENGTH,
} = process.env

export const config = {
    port: num(PORT, 3000),
    origin: ORIGIN || `http://localhost:${num(PORT, 3000)}`,

    // Сколько секунд между двумя созданиями ссылки с одного IP
    limitSeconds: num(LIMIT_SECONDS, 3),
    // Верхние пределы на массовую генерацию ссылок с одного IP
    createPerHour: num(CREATE_PER_HOUR, 20),
    createPerDay: num(CREATE_PER_DAY, 100),

    // Количество прокси перед приложением (Traefik = 1).
    // Без этого express-rate-limit видит IP прокси и лимитирует всех разом.
    trustProxy: num(TRUST_PROXY, 1),

    // Пусто = проверка через Google Safe Browsing выключена
    safeBrowsingKey: SAFE_BROWSING_API_KEY || '',
    // Как часто перепроверять уже сохранённую ссылку при переходе
    recheckHours: num(RECHECK_HOURS, 12),

    maxUrlLength: num(MAX_URL_LENGTH, 2048),
}

// Собственные домены: редирект на самого себя запрещён (петли и маскировка цепочек)
config.selfHosts = [hostOf(config.origin), hostOf(TRAEFIK_DOMAIN)].filter(Boolean)
