const { supabaseAdmin } = require('../config/supabase');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WRITE_ROLES = ['admin', 'lider', 'director', 'vicedirector', 'director_general'];
const READ_ALL_ROLES = ['admin', 'secretaria', 'director_general'];
const READ_SCOPED_ROLES = ['director', 'vicedirector', 'director_general', 'lider'];

const err = (msg, status) => { const e = new Error(msg); e.status = status; return e; };

// Resuelve los department_id permitidos para el usuario segun su rol y departamentos asignados.
// admin/secretaria => todos los de la company. Resto => los que matchean profile.departments (por nombre).
const allowedDeptIds = async (req) => {
  const role = req.profile?.role;
  if (READ_ALL_ROLES.includes(role)) {
    const { data } = await supabaseAdmin
      .from('departments').select('id').eq('company_id', req.companyId);
    return (data || []).map(d => d.id);
  }
  const names = req.profile?.departments || [];
  if (!names.length) return [];
  const { data } = await supabaseAdmin
    .from('departments').select('id, name')
    .eq('company_id', req.companyId).in('name', names);
  return (data || []).map(d => d.id);
};

const hasReadAccess = (req) =>
  READ_ALL_ROLES.includes(req.profile?.role) || READ_SCOPED_ROLES.includes(req.profile?.role);

const canWrite = (req) => WRITE_ROLES.includes(req.profile?.role);

const validDeptParam = (id) => typeof id === 'string' && UUID_RE.test(id);

const accountingController = {
  // GET /api/accounting/transactions?department_id=&from=&to=&type=
  getTransactions: async (req, res, next) => {
    try {
      const { department_id, from, to, type } = req.query;
      if (!hasReadAccess(req)) throw err('No tienes acceso a la contabilidad', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);

      const allowed = await allowedDeptIds(req);
      if (!allowed.includes(department_id)) throw err('Sin acceso a este departamento', 403);

      let query = supabaseAdmin
        .from('accounting_transactions')
        .select('*, departments(name), profiles:created_by(first_name, last_name)')
        .eq('company_id', req.companyId)
        .eq('department_id', department_id);

      if (type && ['ingreso', 'egreso'].includes(type)) query = query.eq('type', type);
      if (from) query = query.gte('movement_date', from);
      if (to) query = query.lte('movement_date', to);

      const { data, error } = await query.order('movement_date', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (error) { next(error); }
  },

  // POST /api/accounting/transactions
  createTransaction: async (req, res, next) => {
    try {
      const { department_id, type, amount, category, description, movement_date } = req.body;
      if (!canWrite(req)) throw err('No tienes permiso para crear movimientos', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);
      if (!['ingreso', 'egreso'].includes(type)) throw err('type debe ser ingreso o egreso', 400);
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw err('amount debe ser un numero mayor a 0', 400);
      if (!movement_date) throw err('movement_date es requerido', 400);

      const allowed = await allowedDeptIds(req);
      if (req.profile.role !== 'admin' && !allowed.includes(department_id)) {
        throw err('Sin acceso a este departamento', 403);
      }

      const { data, error } = await supabaseAdmin
        .from('accounting_transactions')
        .insert([{
          company_id: req.companyId,
          department_id,
          type,
          amount: amt,
          category: category?.trim() || null,
          description: description?.trim() || null,
          movement_date,
          created_by: req.user.id
        }])
        .select('*, departments(name), profiles:created_by(first_name, last_name)')
        .single();
      if (error) throw error;

      res.status(201).json({ success: true, message: 'Movimiento creado', data });
    } catch (error) { next(error); }
  },

  // PUT /api/accounting/transactions/:id
  updateTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type, amount, category, description, movement_date } = req.body;
      if (!canWrite(req)) throw err('No tienes permiso para editar movimientos', 403);
      if (!validDeptParam(id)) throw err('id invalido', 400);

      const { data: existing, error: e1 } = await supabaseAdmin
        .from('accounting_transactions')
        .select('id, department_id')
        .eq('id', id).eq('company_id', req.companyId).single();
      if (e1 || !existing) throw err('Movimiento no encontrado', 404);

      const allowed = await allowedDeptIds(req);
      if (req.profile.role !== 'admin' && !allowed.includes(existing.department_id)) {
        throw err('Sin acceso a este departamento', 403);
      }

      const updates = {};
      if (type !== undefined) {
        if (!['ingreso', 'egreso'].includes(type)) throw err('type debe ser ingreso o egreso', 400);
        updates.type = type;
      }
      if (amount !== undefined) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) throw err('amount debe ser un numero mayor a 0', 400);
        updates.amount = amt;
      }
      if (category !== undefined) updates.category = category?.trim() || null;
      if (description !== undefined) updates.description = description?.trim() || null;
      if (movement_date !== undefined) updates.movement_date = movement_date;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('accounting_transactions')
        .update(updates)
        .eq('id', id).eq('company_id', req.companyId)
        .select('*, departments(name), profiles:created_by(first_name, last_name)')
        .single();
      if (error) throw error;

      res.json({ success: true, message: 'Movimiento actualizado', data });
    } catch (error) { next(error); }
  },

  // DELETE /api/accounting/transactions/:id
  deleteTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!canWrite(req)) throw err('No tienes permiso para eliminar movimientos', 403);
      if (!validDeptParam(id)) throw err('id invalido', 400);

      const { data: existing, error: e1 } = await supabaseAdmin
        .from('accounting_transactions')
        .select('id, department_id')
        .eq('id', id).eq('company_id', req.companyId).single();
      if (e1 || !existing) throw err('Movimiento no encontrado', 404);

      const allowed = await allowedDeptIds(req);
      if (req.profile.role !== 'admin' && !allowed.includes(existing.department_id)) {
        throw err('Sin acceso a este departamento', 403);
      }

      const { error } = await supabaseAdmin
        .from('accounting_transactions')
        .delete().eq('id', id).eq('company_id', req.companyId);
      if (error) throw error;

      res.json({ success: true, message: 'Movimiento eliminado' });
    } catch (error) { next(error); }
  },

  // GET /api/accounting/categories?department_id=&type=
  getCategories: async (req, res, next) => {
    try {
      const { department_id, type } = req.query;
      if (!hasReadAccess(req)) throw err('No tienes acceso a la contabilidad', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);

      const allowed = await allowedDeptIds(req);
      if (!allowed.includes(department_id)) throw err('Sin acceso a este departamento', 403);

      let query = supabaseAdmin
        .from('accounting_transactions')
        .select('category')
        .eq('company_id', req.companyId)
        .eq('department_id', department_id)
        .not('category', 'is', null);
      if (type && ['ingreso', 'egreso'].includes(type)) query = query.eq('type', type);

      const { data, error } = await query;
      if (error) throw error;

      const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort();
      res.json({ success: true, data: categories });
    } catch (error) { next(error); }
  },

  // GET /api/accounting/balance?department_id=&from=&to=
  getBalance: async (req, res, next) => {
    try {
      const { department_id, from, to } = req.query;
      if (!hasReadAccess(req)) throw err('No tienes acceso a la contabilidad', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);

      const allowed = await allowedDeptIds(req);
      if (!allowed.includes(department_id)) throw err('Sin acceso a este departamento', 403);

      let txQuery = supabaseAdmin
        .from('accounting_transactions')
        .select('type, amount')
        .eq('company_id', req.companyId)
        .eq('department_id', department_id);
      if (from) txQuery = txQuery.gte('movement_date', from);
      if (to) txQuery = txQuery.lte('movement_date', to);

      const [{ data: txs, error: e1 }, { data: ob, error: e2 }] = await Promise.all([
        txQuery,
        supabaseAdmin.from('accounting_opening_balances')
          .select('opening_balance')
          .eq('company_id', req.companyId).eq('department_id', department_id).maybeSingle()
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const opening = Number(ob?.opening_balance || 0);
      let ingresos = 0, egresos = 0;
      for (const t of txs || []) {
        if (t.type === 'ingreso') ingresos += Number(t.amount);
        else egresos += Number(t.amount);
      }
      res.json({
        success: true,
        data: {
          opening_balance: opening,
          total_ingresos: ingresos,
          total_egresos: egresos,
          balance: opening + ingresos - egresos
        }
      });
    } catch (error) { next(error); }
  },

  // GET /api/accounting/opening-balance?department_id=
  getOpeningBalance: async (req, res, next) => {
    try {
      const { department_id } = req.query;
      if (!hasReadAccess(req)) throw err('No tienes acceso a la contabilidad', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);

      const allowed = await allowedDeptIds(req);
      if (!allowed.includes(department_id)) throw err('Sin acceso a este departamento', 403);

      const { data, error } = await supabaseAdmin
        .from('accounting_opening_balances')
        .select('opening_balance, updated_at')
        .eq('company_id', req.companyId).eq('department_id', department_id).maybeSingle();
      if (error) throw error;

      res.json({ success: true, data: { opening_balance: Number(data?.opening_balance || 0), updated_at: data?.updated_at || null } });
    } catch (error) { next(error); }
  },

  // PUT /api/accounting/opening-balance
  setOpeningBalance: async (req, res, next) => {
    try {
      const { department_id, opening_balance } = req.body;
      if (!canWrite(req)) throw err('No tienes permiso para modificar el saldo inicial', 403);
      if (!validDeptParam(department_id)) throw err('department_id invalido', 400);
      const ob = Number(opening_balance);
      if (!Number.isFinite(ob)) throw err('opening_balance debe ser un numero', 400);

      const allowed = await allowedDeptIds(req);
      if (req.profile.role !== 'admin' && !allowed.includes(department_id)) {
        throw err('Sin acceso a este departamento', 403);
      }

      const { data, error } = await supabaseAdmin
        .from('accounting_opening_balances')
        .upsert({
          company_id: req.companyId,
          department_id,
          opening_balance: ob,
          updated_by: req.user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,department_id' })
        .select('opening_balance')
        .single();
      if (error) throw error;

      res.json({ success: true, message: 'Saldo inicial actualizado', data });
    } catch (error) { next(error); }
  }
};

module.exports = accountingController;
