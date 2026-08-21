const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const companyRolesController = require('../controllers/companyRolesController');
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

// Roles propios de la empresa. La lectura es abierta a cualquier rol autenticado (los selects
// y las etiquetas necesitan el label); las escrituras las valida el controller (admin/secretaría).
router.get('/roles', companyRolesController.listRoles);
router.post('/roles', companyRolesController.createRole);
router.patch('/roles/:id', companyRolesController.updateRole);
router.delete('/roles/:id', companyRolesController.deleteRole);

// Matriz de permisos por rol. Antes se escribía desde el browser con la anon key.
router.patch('/role-permissions', companyRolesController.updateRolePermissions);

module.exports = router;
