/**
 * Heartbeats hacia Uptime Kuma (monitores tipo "Push").
 *
 * Cada job monitoreado tiene su URL push en una env `KUMA_PUSH_<JOB>`, donde
 * <JOB> es el nombre del job en mayúsculas y con guiones bajos
 * (ej: 'reporte-matutino' -> KUMA_PUSH_REPORTE_MATUTINO).
 *
 * Si la var no está, es no-op silencioso: un job sin monitor no rompe ni ensucia
 * los logs (mismo criterio que telegramService).
 */
async function pushHeartbeat(jobName, { ok = true, msg = 'OK' } = {}) {
    const envKey = `KUMA_PUSH_${jobName.toUpperCase().replace(/-/g, '_')}`;
    const url = process.env[envKey];
    if (!url) return;

    try {
        const params = new URLSearchParams({
            status: ok ? 'up' : 'down',
            msg: String(msg).slice(0, 200),
        });
        const res = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
            console.error(`❌ [Kuma] Heartbeat ${jobName} rechazado (${res.status})`);
        }
    } catch (err) {
        // No se reporta a Sentry: si el heartbeat no llega, Kuma ya alerta por latido faltante.
        console.error(`❌ [Kuma] Heartbeat ${jobName} falló: ${err.message}`);
    }
}

module.exports = { pushHeartbeat };
