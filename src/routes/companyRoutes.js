const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const companyRolesController = require('../controllers/companyRolesController');
const { VERSIONES: VERSIONES_VERSICULO } = require('../controllers/dailyVerseController');
const router = express.Router();

// GET /api/company - Datos de la empresa del usuario logueado (cualquier rol).
// La pantalla de login sigue leyendo companies por Supabase/RLS porque necesita el nombre
// y el logo antes de que exista sesión.
router.get('/', async (req, res, next) => {
  try {
    if (!req.companyId) return res.json({ success: true, data: null });

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', req.companyId)
      .single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/company/badges - Insignias de la empresa del usuario logueado (cualquier rol)
router.get('/badges', async (req, res, next) => {
  try {
    // system_admin no tiene empresa propia
    if (!req.companyId) return res.json({ success: true, data: [] });

    const { data, error } = await supabaseAdmin
      .from('company_badges')
      .select('granted_at, badges(id, code, label, description, icon, color, tier, is_active, sort)')
      .eq('company_id', req.companyId);
    if (error) throw error;

    const badges = (data || [])
      .filter((cb) => cb.badges && cb.badges.is_active)
      .map((cb) => ({ ...cb.badges, granted_at: cb.granted_at }))
      .sort((a, b) => a.sort - b.sort);

    res.json({ success: true, data: badges });
  } catch (error) { next(error); }
});

// PATCH /api/company/settings - Ajustes del versiculo del dia (solo admin/secretaria).
// Escritura nueva: va por el back con allowlist de campos, no por supabase.from() del front.
router.patch('/settings', async (req, res, next) => {
  try {
    const roles = [req.profile?.role, ...(req.profile?.roles || [])];
    if (!roles.includes('admin') && !roles.includes('secretaria')) {
      return res.status(403).json({ success: false, message: 'Solo el administrador o la secretaría pueden cambiar estos ajustes' });
    }

    const updates = {};
    if (req.body.daily_verse_enabled !== undefined) {
      if (typeof req.body.daily_verse_enabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'daily_verse_enabled debe ser booleano' });
      }
      updates.daily_verse_enabled = req.body.daily_verse_enabled;
    }
    if (req.body.daily_verse_version !== undefined) {
      if (!VERSIONES_VERSICULO.includes(req.body.daily_verse_version)) {
        return res.status(400).json({ success: false, message: `Versión inválida. Opciones: ${VERSIONES_VERSICULO.join(', ')}` });
      }
      updates.daily_verse_version = req.body.daily_verse_version;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Nada para actualizar' });
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('id', req.companyId)
      .select('daily_verse_enabled, daily_verse_version')
      .single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// Roles propios de la empresa. La lectura es abierta a cualquier rol autenticado (los selects
// y las etiquetas necesitan el label); las escrituras las valida el controller (admin/secretaría).
router.get('/roles', companyRolesController.listRoles);
router.post('/roles', companyRolesController.createRole);
router.patch('/roles/:id', companyRolesController.updateRole);
router.delete('/roles/:id', companyRolesController.deleteRole);

// Matriz de permisos por rol. Antes se escribía desde el browser con la anon key.
router.patch('/role-permissions', companyRolesController.updateRolePermissions);

module.exports = router;
