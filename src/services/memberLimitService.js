const { supabase } = require('../config/supabase');
const { effectiveLimit } = require('../config/plans');

// Lanza un error 403 (MEMBER_LIMIT_REACHED) si la empresa ya alcanzó el límite de
// miembros de su plan. Usado en cualquier alta nueva de `students` (alumnos y,
// desde grupos pequeños, contactos sin cuenta), para que todo el mundo cuente
// contra el mismo límite sin importar por dónde entró.
async function assertMemberLimitNotReached(companyId) {
    const { data: companyRow } = await supabase
        .from('companies')
        .select('plan, extra_member_packs')
        .eq('id', companyId)
        .single();
    const memberLimit = effectiveLimit(companyRow?.plan, companyRow?.extra_member_packs);
    if (memberLimit == null) return;

    const { count: currentMembers } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null);

    if ((currentMembers || 0) >= memberLimit) {
        const err = new Error('Alcanzaste el límite de miembros de tu plan (' + memberLimit + '). Contactá al administrador del sistema para ampliar tu plan o agregar packs de miembros.');
        err.status = 403;
        err.code = 'MEMBER_LIMIT_REACHED';
        throw err;
    }
}

module.exports = { assertMemberLimitNotReached };
