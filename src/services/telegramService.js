const Sentry = require('@sentry/node');

/**
 * Envía alertas operativas a Telegram (ej: caídas de WhatsApp).
 * Config por env: TELEGRAM_BOT_TOKEN (de @BotFather) y TELEGRAM_CHAT_ID (de @userinfobot).
 * Si falta config, es no-op silencioso (no rompe el flujo que lo llama).
 */
async function sendTelegramAlert(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        });
        if (!res.ok) {
            const body = await res.text();
            console.error(`❌ [Telegram] Falló el envío (${res.status}): ${body}`);
        }
    } catch (err) {
        console.error('❌ [Telegram] Error enviando alerta:', err.message);
        Sentry.captureException(err, { tags: { service: 'telegram' } });
    }
}

module.exports = { sendTelegramAlert };
