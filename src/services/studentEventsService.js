const { supabaseAdmin } = require('../config/supabase');

// Bitácora de movimientos de un miembro (tabla student_events, ver migrations/add_student_events.sql).
//
// Regla de oro: registrar un evento NUNCA puede tumbar la operación que lo generó. El alta,
// la baja o la promoción ya se escribieron cuando llamamos acá; si el log falla, se loguea el
// error y sigue. Por eso ninguna función de este módulo lanza.
//
// Se escribe con supabaseAdmin (service key) porque la tabla tiene RLS activo sin políticas:
// el browser no puede tocarla.

const EVENT = {
  ALTA: 'alta',
  BAJA: 'baja',
  REACTIVACION: 'reactivacion',
  VINCULACION: 'vinculacion',
  CAMBIO_DEPARTAMENTO: 'cambio_departamento',
  DESVINCULACION: 'desvinculacion',
  PROMOCION: 'promocion',
  FUSION: 'fusion',
  EDICION: 'edicion',
  BAUTISMO: 'bautismo',
};

// Campos personales cuyo cambio vale la pena guardar. Quedan afuera los técnicos
// (company_id, profile_id, deleted_at) y los que ya generan su propio evento (department_id).
const TRACKED_FIELDS = [
  'first_name', 'last_name', 'birthdate', 'gender',
  'phone', 'address', 'document_number', 'baptized', 'assigned_class',
];

const actorName = (req) => {
  const p = req?.profile || {};
  const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  return name || req?.user?.email || null;
};

// Devuelve { campo: { de, a } } con los campos de TRACKED_FIELDS que realmente cambiaron.
const buildFieldDiff = (before = {}, after = {}) => {
  const diff = {};
  TRACKED_FIELDS.forEach((field) => {
    if (!(field in after)) return;
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (from !== to) diff[field] = { de: from, a: to };
  });
  return diff;
};

// Nombres de departamento por id, para que el evento guarde el nombre y no solo el uuid:
// si mañana borran el departamento, el historial tiene que seguir siendo legible.
const deptNames = async (companyId, ids = []) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .in('id', unique)
      .eq('company_id', companyId);
    return Object.fromEntries((data || []).map((d) => [d.id, d.name]));
  } catch (e) {
    return {};
  }
};

// Registra un movimiento. `req` aporta empresa y autor; el resto describe el evento.
const logStudentEvent = async (req, { studentId, type, departmentId = null, detail = {}, occurredAt = null }) => {
  if (!studentId || !type || !req?.companyId) return;
  try {
    const { error } = await supabaseAdmin.from('student_events').insert({
      company_id: req.companyId,
      student_id: studentId,
      event_type: type,
      occurred_at: occurredAt || new Date().toISOString(),
      actor_id: req.user?.id || null,
      actor_name: actorName(req),
      department_id: departmentId,
      detail,
    });
    if (error) throw error;
  } catch (e) {
    console.error(`[student_events] no se pudo registrar "${type}":`, e.message);
  }
};

// Igual que logStudentEvent pero para varios miembros de una (promoción masiva),
// en un solo insert.
const logStudentEvents = async (req, events = []) => {
  if (!req?.companyId || events.length === 0) return;
  const now = new Date().toISOString();
  const actor = actorName(req);
  try {
    const { error } = await supabaseAdmin.from('student_events').insert(
      events.map((e) => ({
        company_id: req.companyId,
        student_id: e.studentId,
        event_type: e.type,
        occurred_at: e.occurredAt || now,
        actor_id: req.user?.id || null,
        actor_name: actor,
        department_id: e.departmentId || null,
        detail: e.detail || {},
      }))
    );
    if (error) throw error;
  } catch (e) {
    console.error('[student_events] no se pudo registrar el lote:', e.message);
  }
};

module.exports = { EVENT, TRACKED_FIELDS, buildFieldDiff, deptNames, logStudentEvent, logStudentEvents };
