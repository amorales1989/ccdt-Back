const { supabaseAdmin } = require('../config/supabase');
const { createPreference, createPreapproval } = require('../services/mercadopagoService');
const { PACK_SIZE, effectiveLimit, monthlyPrice } = require('../config/plans');

// Endpoints de suscripción de la empresa. Scope siempre por req.companyId (multi-tenant).
// Admin y secretaria pueden consultar/gestionar la suscripción (plan, packs, pagos).

function ensureAdmin(req, res) {
  if (req.profile?.role !== 'admin' && req.profile?.role !== 'secretaria') {
    res.status(403).json({ success: false, message: 'Acceso restringido al administrador o secretaría de la empresa' });
    return false;
  }
  return true;
}

// Prorrateo: días restantes del ciclo actual / días del ciclo.
function prorateFactor(due_date, billing_cycle) {
  const cycleDays = billing_cycle === 'anual' ? 365 : 30;
  if (!due_date) return 1;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const due = new Date(due_date);
  const daysRemaining = Math.max(0, Math.floor((due.getTime() - today.getTime()) / 86400000));
  return Math.min(daysRemaining, cycleDays) / cycleDays;
}

function cyclePrice(monthly, billing_cycle) {
  return billing_cycle === 'anual' ? Number(monthly) * 10 : Number(monthly);
}

// Monto recurrente del preapproval: plan (según miembros actuales, ver monthlyPrice) + packs.
function recurringAmount(plan_row, packs, billing_cycle, memberCount) {
  const base = monthlyPrice(plan_row.value, plan_row.price_monthly, memberCount) + Number(packs || 0) * Number(plan_row.pack_price_monthly);
  return billing_cycle === 'anual' ? base * 10 : base;
}

// Trae company + plan actual + member_count; helper compartido por quote/change-plan/packs.
async function loadContext(companyId) {
  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('plan, extra_member_packs, billing_cycle, due_date')
    .eq('id', companyId)
    .single();
  if (cErr) throw cErr;

  const { data: plans, error: pErr } = await supabaseAdmin.from('plans').select('*');
  if (pErr) throw pErr;

  const { count: member_count, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null);
  if (sErr) throw sErr;

  const curPlan = plans.find((p) => p.value === company.plan) || null;
  return { company, plans, curPlan, member_count: member_count || 0 };
}

const subscriptionController = {
  // GET /api/subscription (lectura: admin y secretaria)
  getSubscription: async (req, res, next) => {
    try {
      if (req.profile?.role !== 'admin' && req.profile?.role !== 'secretaria') {
        return res.status(403).json({ success: false, message: 'Acceso restringido' });
      }

      const { data: company, error: cErr } = await supabaseAdmin
        .from('companies')
        .select('plan, extra_member_packs, billing_cycle, due_date, last_payment_date, pending_plan, pending_extra_member_packs, mp_preapproval_id, subscription_status')
        .eq('id', req.companyId)
        .single();
      if (cErr) throw cErr;
      if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      const { count: member_count, error: sErr } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', req.companyId)
        .is('deleted_at', null);
      if (sErr) throw sErr;

      const { data: plans, error: pErr } = await supabaseAdmin.from('plans').select('*').order('sort');
      if (pErr) throw pErr;

      res.json({
        success: true,
        ...company,
        member_count: member_count || 0,
        plans: plans || [],
      });
    } catch (error) { next(error); }
  },

  // POST /api/subscription/renew
  renew: async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return;

      const billing_cycle = req.body?.billing_cycle === 'anual' ? 'anual' : 'mensual';

      if (!process.env.MP_ACCESS_TOKEN) {
        return res.status(503).json({ success: false, message: 'Pagos no configurados (falta MP_ACCESS_TOKEN)' });
      }

      const { data: company, error: cErr } = await supabaseAdmin
        .from('companies')
        .select('plan')
        .eq('id', req.companyId)
        .single();
      if (cErr) throw cErr;
      if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      const { data: planRow, error: pErr } = await supabaseAdmin
        .from('plans')
        .select('value, price_monthly')
        .eq('value', company.plan)
        .maybeSingle();
      if (pErr) throw pErr;

      if (!company.plan || !planRow || Number(planRow.price_monthly) <= 0) {
        return res.status(400).json({ success: false, message: 'Plan sin precio, contactá al administrador' });
      }

      const { count: member_count, error: sErr } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', req.companyId)
        .is('deleted_at', null);
      if (sErr) throw sErr;

      const monthly = monthlyPrice(planRow.value, planRow.price_monthly, member_count || 0);
      const amount = billing_cycle === 'anual' ? monthly * 10 : monthly;
      const externalReference = `renewal:${req.companyId}:${billing_cycle}:${Date.now()}`;

      const { init_point } = await createPreference({
        title: 'Renovación suscripción',
        amount,
        externalReference,
        metadata: { type: 'renewal', company_id: req.companyId, billing_cycle },
      });

      res.json({ success: true, init_point, amount });
    } catch (error) { next(error); }
  },

  // POST /api/subscription/subscribe { billing_cycle } - Crea débito automático (preapproval), opción principal.
  subscribe: async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return;

      const billing_cycle = req.body?.billing_cycle === 'anual' ? 'anual' : 'mensual';

      if (!process.env.MP_ACCESS_TOKEN) {
        return res.status(503).json({ success: false, message: 'Pagos no configurados (falta MP_ACCESS_TOKEN)' });
      }

      const { data: company, error: cErr } = await supabaseAdmin
        .from('companies')
        .select('plan, extra_member_packs')
        .eq('id', req.companyId)
        .single();
      if (cErr) throw cErr;
      if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      const { data: planRow, error: pErr } = await supabaseAdmin
        .from('plans')
        .select('value, price_monthly, pack_price_monthly, label')
        .eq('value', company.plan)
        .maybeSingle();
      if (pErr) throw pErr;

      if (!company.plan || !planRow || Number(planRow.price_monthly) <= 0) {
        return res.status(400).json({ success: false, message: 'Plan sin precio, contactá al administrador' });
      }

      const { count: member_count, error: sErr } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', req.companyId)
        .is('deleted_at', null);
      if (sErr) throw sErr;

      const amount = recurringAmount(planRow, company.extra_member_packs || 0, billing_cycle, member_count || 0);
      const frequency = billing_cycle === 'anual' ? 12 : 1;
      const externalReference = `sub:${req.companyId}:${Date.now()}`;

      const { id, init_point } = await createPreapproval({
        reason: `Suscripción Nexus - ${planRow.label}`,
        amount,
        frequency,
        payerEmail: req.user.email,
        externalReference,
      });

      const { error: updErr } = await supabaseAdmin
        .from('companies')
        .update({ mp_preapproval_id: id, subscription_status: 'pending', billing_cycle })
        .eq('id', req.companyId);
      if (updErr) throw updErr;

      res.json({ success: true, init_point });
    } catch (error) { next(error); }
  },

  // GET /api/subscription/quote?type=plan&plan=<value> | ?type=packs&delta=<n>
  quote: async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return;

      const { type } = req.query;
      if (type !== 'plan' && type !== 'packs') {
        const err = new Error('type debe ser "plan" o "packs"');
        err.status = 400;
        throw err;
      }

      const ctx = await loadContext(req.companyId);
      const factor = prorateFactor(ctx.company.due_date, ctx.company.billing_cycle);

      if (type === 'plan') {
        const planValue = req.query.plan;
        const newPlan = ctx.plans.find((p) => p.value === planValue);
        if (!planValue || !newPlan) {
          const err = new Error('Plan inválido'); err.status = 400; throw err;
        }
        if (!ctx.curPlan) {
          const err = new Error('La empresa no tiene un plan actual asignado'); err.status = 400; throw err;
        }
        if (newPlan.value === ctx.curPlan.value) {
          const err = new Error('Ya estás en ese plan'); err.status = 400; throw err;
        }

        const isUpgrade = Number(newPlan.price_monthly) > Number(ctx.curPlan.price_monthly);
        if (isUpgrade) {
          const newMonthly = monthlyPrice(newPlan.value, newPlan.price_monthly, ctx.member_count);
          const curMonthly = monthlyPrice(ctx.curPlan.value, ctx.curPlan.price_monthly, ctx.member_count);
          const amount = Math.round((cyclePrice(newMonthly, ctx.company.billing_cycle) - cyclePrice(curMonthly, ctx.company.billing_cycle)) * factor);
          return res.json({ success: true, mode: 'charge', amount });
        }

        const newLimit = effectiveLimit(newPlan.value, ctx.company.extra_member_packs);
        if (newLimit != null && newLimit < ctx.member_count) {
          const err = new Error(`No podés bajar a un plan por debajo de tus miembros actuales (${ctx.member_count})`);
          err.status = 400; throw err;
        }
        return res.json({ success: true, mode: 'schedule', amount: 0, effect: 'Se aplica al renovar el ciclo' });
      }

      // type === 'packs'
      const delta = Number(req.query.delta);
      if (!Number.isInteger(delta) || delta === 0) {
        const err = new Error('delta debe ser un entero distinto de 0'); err.status = 400; throw err;
      }
      if (!ctx.curPlan) {
        const err = new Error('La empresa no tiene un plan actual asignado'); err.status = 400; throw err;
      }

      if (delta > 0) {
        const amount = Math.round(cyclePrice(ctx.curPlan.pack_price_monthly, ctx.company.billing_cycle) * delta * factor);
        return res.json({ success: true, mode: 'charge', amount });
      }

      const newPacks = Math.max(0, Number(ctx.company.extra_member_packs) + delta);
      const newLimit = effectiveLimit(ctx.curPlan.value, newPacks);
      if (newLimit != null && newLimit < ctx.member_count) {
        const err = new Error(`No podés bajar la capacidad por debajo de tus miembros actuales (${ctx.member_count})`);
        err.status = 400; throw err;
      }
      return res.json({ success: true, mode: 'schedule', amount: 0, effect: 'Se aplica al renovar el ciclo' });
    } catch (error) { next(error); }
  },

  // POST /api/subscription/change-plan { plan }
  changePlan: async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return;

      const planValue = req.body?.plan;
      if (!planValue || typeof planValue !== 'string') {
        const err = new Error('plan es requerido'); err.status = 400; throw err;
      }

      const ctx = await loadContext(req.companyId);
      const newPlan = ctx.plans.find((p) => p.value === planValue);
      if (!newPlan) { const err = new Error('Plan inválido'); err.status = 400; throw err; }
      if (!ctx.curPlan) { const err = new Error('La empresa no tiene un plan actual asignado'); err.status = 400; throw err; }
      if (newPlan.value === ctx.curPlan.value) { const err = new Error('Ya estás en ese plan'); err.status = 400; throw err; }

      const isUpgrade = Number(newPlan.price_monthly) > Number(ctx.curPlan.price_monthly);
      const factor = prorateFactor(ctx.company.due_date, ctx.company.billing_cycle);

      if (isUpgrade) {
        if (!process.env.MP_ACCESS_TOKEN) {
          return res.status(503).json({ success: false, message: 'Pagos no configurados (falta MP_ACCESS_TOKEN)' });
        }
        const newMonthly = monthlyPrice(newPlan.value, newPlan.price_monthly, ctx.member_count);
        const curMonthly = monthlyPrice(ctx.curPlan.value, ctx.curPlan.price_monthly, ctx.member_count);
        const amount = Math.round((cyclePrice(newMonthly, ctx.company.billing_cycle) - cyclePrice(curMonthly, ctx.company.billing_cycle)) * factor);
        const externalReference = `change_plan:${req.companyId}:${planValue}:${Date.now()}`;
        const { init_point } = await createPreference({
          title: `Cambio de plan ${newPlan.label}`,
          amount,
          externalReference,
          metadata: { type: 'change_plan', company_id: req.companyId, new_plan: planValue },
        });
        return res.json({ success: true, mode: 'charge', init_point, amount });
      }

      const newLimit = effectiveLimit(newPlan.value, ctx.company.extra_member_packs);
      if (newLimit != null && newLimit < ctx.member_count) {
        const err = new Error(`No podés bajar a un plan por debajo de tus miembros actuales (${ctx.member_count})`);
        err.status = 400; throw err;
      }

      const { error: updErr } = await supabaseAdmin
        .from('companies')
        .update({ pending_plan: planValue })
        .eq('id', req.companyId);
      if (updErr) throw updErr;

      res.json({ success: true, mode: 'schedule' });
    } catch (error) { next(error); }
  },

  // POST /api/subscription/packs { delta }
  packs: async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return;

      const delta = Number(req.body?.delta);
      if (!Number.isInteger(delta) || delta === 0) {
        const err = new Error('delta debe ser un entero distinto de 0'); err.status = 400; throw err;
      }

      const ctx = await loadContext(req.companyId);
      if (!ctx.curPlan) { const err = new Error('La empresa no tiene un plan actual asignado'); err.status = 400; throw err; }

      if (delta > 0) {
        if (!process.env.MP_ACCESS_TOKEN) {
          return res.status(503).json({ success: false, message: 'Pagos no configurados (falta MP_ACCESS_TOKEN)' });
        }
        const factor = prorateFactor(ctx.company.due_date, ctx.company.billing_cycle);
        const amount = Math.round(cyclePrice(ctx.curPlan.pack_price_monthly, ctx.company.billing_cycle) * delta * factor);
        const externalReference = `add_packs:${req.companyId}:${delta}:${Date.now()}`;
        const { init_point } = await createPreference({
          title: `Agregar ${delta} pack(s) de miembros`,
          amount,
          externalReference,
          metadata: { type: 'add_packs', company_id: req.companyId, delta },
        });
        return res.json({ success: true, mode: 'charge', init_point, amount });
      }

      const pending_extra_member_packs = Math.max(0, Number(ctx.company.extra_member_packs) + delta);
      const newLimit = effectiveLimit(ctx.curPlan.value, pending_extra_member_packs);
      if (newLimit != null && newLimit < ctx.member_count) {
        const err = new Error(`No podés bajar la capacidad por debajo de tus miembros actuales (${ctx.member_count})`);
        err.status = 400; throw err;
      }

      const { error: updErr } = await supabaseAdmin
        .from('companies')
        .update({ pending_extra_member_packs })
        .eq('id', req.companyId);
      if (updErr) throw updErr;

      res.json({ success: true, mode: 'schedule', pending_extra_member_packs });
    } catch (error) { next(error); }
  },

  // GET /api/subscription/payments - Historial de pagos de la empresa (admin/secretaria, lectura)
  getPayments: async (req, res, next) => {
    try {
      if (req.profile?.role !== 'admin' && req.profile?.role !== 'secretaria') {
        return res.status(403).json({ success: false, message: 'Acceso restringido' });
      }
      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('company_id', req.companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) { next(error); }
  },
};

module.exports = subscriptionController;
module.exports.recurringAmount = recurringAmount;
