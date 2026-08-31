const { Resend } = require('resend');

// Envío de mails masivos (broadcast de la pantalla Notificaciones).
// Resend acepta lotes de hasta 100 mails por request; se manda un mail por persona
// (nunca un "to" con varias direcciones) para que nadie vea la lista del resto.
const BATCH_SIZE = 100;
const FROM = process.env.MAIL_FROM || 'Nexus <onboarding@resend.dev>';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

class EmailService {
    // recipients: [{ email, name }] — devuelve { sent, failed, skipped }
    async sendBulk(recipients, subject, message, link) {
        const valid = (recipients || []).filter((r) => isEmail(r.email));
        if (valid.length === 0) return { sent: 0, failed: 0, skipped: 0 };

        if (!resend) {
            console.error(`❌ [EmailService] Falta RESEND_API_KEY: ${valid.length} mails sin enviar`);
            return { sent: 0, failed: 0, skipped: valid.length };
        }
        // Mismo feature flag que usan los mails del calendario.
        if (process.env.PERMITE_MAIL !== 'true') {
            console.log(`🚫 [EmailService] Bloqueado por PERMITE_MAIL=${process.env.PERMITE_MAIL}: ${valid.length} mails simulados`);
            return { sent: 0, failed: 0, skipped: valid.length };
        }

        const text = link ? `${message}\n\n${link}` : message;
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < valid.length; i += BATCH_SIZE) {
            const batch = valid.slice(i, i + BATCH_SIZE);
            try {
                const { error } = await resend.batch.send(
                    batch.map((r) => ({ from: FROM, to: [r.email.trim()], subject, text }))
                );
                if (error) throw new Error(error.message);
                sent += batch.length;
            } catch (err) {
                console.error('❌ [EmailService] Error enviando lote:', err.message);
                failed += batch.length;
            }
        }

        console.log(`📧 [EmailService] enviados=${sent} fallidos=${failed}`);
        return { sent, failed, skipped: 0 };
    }
}

module.exports = new EmailService();
