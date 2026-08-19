/**
 * Backfill de la bitácora (student_events) con lo único que se puede reconstruir del pasado:
 * un evento 'alta' por cada ficha (fecha = created_at) y un 'baja' por cada ficha borrada
 * (fecha = deleted_at). Sin autor: en su momento nadie lo registró.
 *
 * Sirve para que la línea de tiempo de la gente que ya está en el sistema no arranque vacía.
 * Los movimientos intermedios (promociones, cambios de departamento) se perdieron y no hay
 * de dónde sacarlos.
 *
 * Es idempotente: saltea las fichas que ya tienen ese evento, así que se puede correr de nuevo.
 *
 * Uso: node src/scripts/backfill_student_events.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

const CHUNK = 500;

async function main() {
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, company_id, first_name, last_name, department_id, created_at, deleted_at, deleted_reason');
  if (error) throw error;

  console.log(`Fichas encontradas: ${students.length}`);

  // Eventos ya existentes, para no duplicar si el script se corre dos veces.
  const { data: existentes, error: exErr } = await supabaseAdmin
    .from('student_events')
    .select('student_id, event_type')
    .in('event_type', ['alta', 'baja']);
  if (exErr) throw exErr;

  const yaTiene = new Set((existentes || []).map(e => `${e.student_id}:${e.event_type}`));

  const rows = [];
  students.forEach(s => {
    const nombre = `${s.first_name} ${s.last_name || ''}`.trim();

    if (s.created_at && !yaTiene.has(`${s.id}:alta`)) {
      rows.push({
        company_id: s.company_id,
        student_id: s.id,
        event_type: 'alta',
        occurred_at: s.created_at,
        department_id: s.department_id || null,
        detail: { nombre, origen: 'backfill' },
      });
    }

    if (s.deleted_at && !yaTiene.has(`${s.id}:baja`)) {
      rows.push({
        company_id: s.company_id,
        student_id: s.id,
        event_type: 'baja',
        occurred_at: s.deleted_at,
        department_id: s.department_id || null,
        detail: { nombre, motivo: s.deleted_reason || null, origen: 'backfill' },
      });
    }
  });

  console.log(`Eventos a insertar: ${rows.length}`);
  if (rows.length === 0) {
    console.log('Nada que hacer.');
    return;
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const lote = rows.slice(i, i + CHUNK);
    const { error: insErr } = await supabaseAdmin.from('student_events').insert(lote);
    if (insErr) throw insErr;
    console.log(`  insertados ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log('Backfill terminado.');
}

main().catch(err => {
  console.error('Falló el backfill:', err.message);
  process.exit(1);
});
