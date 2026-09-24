require('./env');

// Levanta la app en un puerto libre. Usa src/app.js (sin cron ni WhatsApp).
const startApp = async () => {
    const app = require('../../src/app');
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const request = async (path, { method = 'GET', token, companyId, body, headers = {} } = {}) => {
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(companyId ? { 'x-company-id': String(companyId) } : {}),
                ...headers,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const texto = await res.text();
        let json = null;
        try { json = texto ? JSON.parse(texto) : null; } catch { /* respuesta no-JSON */ }
        return { status: res.status, body: json, text: texto };
    };

    return {
        baseUrl,
        request,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
};

module.exports = { startApp };
