/**
 * Migra los dept_assignments de user_metadata (auth) → tabla student_departments
 * para los 68 usuarios que solo tienen ese dato en auth.users.
 *
 * Uso: node src/scripts/migrate_assignments.js
 * (correr UNA sola vez antes de desplegar el nuevo studentsController)
 */

require('dotenv').config();
const { supabase, supabaseAdmin } = require('../config/supabase');

async function main() {
  // 1. Traer students con profile_id pero sin filas en student_departments
  const { data: orphans, error: orphanErr } = await supabase
    .from('students')
    .select('id, profile_id, company_id, first_name, last_name')
    .not('profile_id', 'is', null)
    .is('deleted_at', null);

  if (orphanErr) throw orphanErr;

  // Filtrar los que ya tienen entradas en student_departments
  const { data: existing } = await supabase
    .from('student_departments')
    .select('student_id');

  const existingIds = new Set((existing || []).map(r => r.student_id));
  const toMigrate = (orphans || []).filter(s => !existingIds.has(s.id));

  console.log(`Students a migrar: ${toMigrate.length}`);
  if (toMigrate.length === 0) {
    console.log('Nada que migrar.');
    return;
  }

  // 2. Traer todos los departments para resolver nombre → id
  const { data: allDepts } = await supabase
    .from('departments')
    .select('id, name, classes');

  const deptByName = {};
  (allDepts || []).forEach(d => {
    deptByName[d.name.toLowerCase()] = d;
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const student of toMigrate) {
    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(student.profile_id);
      if (authErr || !authData?.user) {
        console.warn(`  SKIP ${student.first_name} ${student.last_name} — no encontrado en auth`);
        skipped++;
        continue;
      }

      const assignments = authData.user.user_metadata?.assignments || [];
      if (assignments.length === 0) {
        console.warn(`  SKIP ${student.first_name} ${student.last_name} — sin assignments en metadata`);
        skipped++;
        continue;
      }

      const rows = assignments
        .map(a => {
          const dept = deptByName[a.department?.toLowerCase()] || null;
          const deptId = a.department_id || dept?.id;
          if (!deptId) {
            console.warn(`    Departamento no encontrado: "${a.department}" — se omite`);
            return null;
          }
          return {
            student_id:     student.id,
            department_id:  deptId,
            assigned_class: a.assigned_class || null,
            role_in_dept:   a.role || 'alumno',
            company_id:     student.company_id,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) {
        skipped++;
        continue;
      }

      const { error: upsertErr } = await supabase
        .from('student_departments')
        .upsert(rows, { onConflict: 'student_id,department_id' });

      if (upsertErr) {
        console.error(`  ERROR ${student.first_name} ${student.last_name}:`, upsertErr.message);
        errors++;
      } else {
        console.log(`  OK ${student.first_name} ${student.last_name} — ${rows.length} assignment(s)`);
        migrated++;
      }
    } catch (e) {
      console.error(`  ERROR inesperado para ${student.id}:`, e.message);
      errors++;
    }
  }

  console.log(`\nResumen: ${migrated} migrados, ${skipped} saltados, ${errors} errores`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
