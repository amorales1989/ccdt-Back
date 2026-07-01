const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Admin client to bypass RLS and perform administrative actions
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 60 minutes

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No se proporcionó token de autenticación' });
        }

        const token = authHeader.split(' ')[1];

        // 1. Verificar el token con Supabase y obtener el usuario
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ success: false, message: 'Token de autenticación inválido o expirado' });
        }

        // 2. Verificar inactividad en el perfil
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('last_active_at, company_id, role, departments, department_id')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Error al obtener perfil en AuthMiddleware:', profileError);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }

        const now = new Date();
        const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : now;
        const diff = now.getTime() - lastActive.getTime();

        // Lógica de detección de Login fresco para evitar falsos positivos de inactividad
        let isFreshLogin = false;
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const iat = payload.iat * 1000;
            const tokenAgeMs = now.getTime() - iat;

            if (tokenAgeMs < 5 * 60 * 1000) {
                isFreshLogin = true;
            }
        } catch (e) {
            // Error decodificando token, seguimos con el flujo normal
        }

        if (!isFreshLogin && diff > INACTIVITY_LIMIT_MS) {
            // Invalidar sesión en Supabase
            await supabaseAdmin.auth.admin.signOut(user.id);

            return res.status(401).json({
                success: false,
                message: 'Sesión cerrada automáticamente por inactividad. Por favor inicia sesión nuevamente.',
                code: 'INACTIVITY_TIMEOUT'
            });
        }

        // 3. Actualizar last_active_at
        // Usamos admin client para asegurar que se actualice sin importar RLS
        await supabaseAdmin
            .from('profiles')
            .update({ last_active_at: now.toISOString() })
            .eq('id', user.id);

        // Adjuntar usuario al request para uso posterior
        req.user = user;

        // Perfil con rol y departamentos (fuente de verdad server-side para autorizacion).
        // No confiar nunca en rol/departamentos provistos por el cliente.
        req.profile = {
            role: profile?.role || null,
            departments: profile?.departments || [],
            department_id: profile?.department_id || null
        };

        // System admin: super admin por encima de todas las empresas. No tiene company_id
        // y opera cross-tenant; salteamos la exigencia/derivacion de company_id.
        if (profile?.role === 'system_admin') {
            req.isSystemAdmin = true;
            req.companyId = null;
            return next();
        }

        // 4. Determinar companyId
        // Seguridad multi-tenant: la congregación SIEMPRE se deriva del perfil del usuario.
        // Nunca confiamos en un company_id provisto por el cliente (header/query).
        const profileCompanyId = profile?.company_id;
        const rawClientCompanyId = req.headers['x-company-id'] || req.query.companyId;
        const clientCompanyId = rawClientCompanyId ? parseInt(rawClientCompanyId, 10) : null;

        if (profileCompanyId) {
            if (clientCompanyId && clientCompanyId !== profileCompanyId) {
                console.warn(`Intento de tenant spoofing: usuario ${user.id} (company ${profileCompanyId}) envió companyId ${clientCompanyId}`);
            }
            req.companyId = profileCompanyId;
        } else {
            // Solo como fallback si el perfil no tiene company_id (no debería pasar)
            req.companyId = clientCompanyId;
        }

        // Si aún no tenemos companyId, devolvemos error (evitamos default a 1)
        if (!req.companyId) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo determinar el ID de la empresa para esta solicitud'
            });
        }

        // Bloqueo por empresa deshabilitada (ej: falta de pago). El system_admin ya retornó arriba.
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('is_active')
            .eq('id', req.companyId)
            .single();

        if (company && company.is_active === false) {
            return res.status(403).json({
                success: false,
                code: 'COMPANY_INACTIVE',
                role: profile?.role || null,
                message: 'Empresa deshabilitada. Contactá al administrador del sistema.'
            });
        }

        next();
    } catch (error) {
        console.error('Error en AuthMiddleware:', error);
        res.status(500).json({ success: false, message: 'Error de servidor en autenticación' });
    }
};

module.exports = authMiddleware;
