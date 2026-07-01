/**
 * Crea el primer usuario system_admin (super admin por encima de todas las empresas).
 * Requiere haber corrido antes migrations/add_system_admin.sql (enum + columnas).
 *
 * Uso: node src/scripts/create_system_admin.js <email> <password> [nombre]
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function main() {
  const [email, password, name = 'System'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: node src/scripts/create_system_admin.js <email> <password> [nombre]');
    process.exit(1);
  }

  const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const userId = created.user.id;

  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email, first_name: name, role: 'system_admin', company_id: null });
  if (profileErr) throw profileErr;

  console.log(`✅ system_admin creado: ${email} (${userId})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
