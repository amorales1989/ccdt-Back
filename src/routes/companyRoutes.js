const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();

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

module.exports = router;
