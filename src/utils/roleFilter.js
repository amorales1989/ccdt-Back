/**
 * Un perfil puede tener varios roles: la columna `role` guarda el primario y el
 * array `roles` el conjunto completo. Filtrar solo por `role` deja afuera, por
 * ejemplo, a un conserje cuyo rol primario es lider.
 *
 * Devuelve el filtro para `.or(...)` que matchea el rol primario O cualquiera
 * del array. Usar siempre asi:
 *
 *   supabase.from('profiles').select(...).or(anyRole(['conserje','admin']))
 *
 * Los valores van entre comillas porque hay roles con punto y guion
 * ('secr.-calendario') que romperian la lista de PostgREST sin comillar.
 */
const quote = (v) => `"${String(v).replace(/"/g, '\\"')}"`;

const anyRole = (roles) => {
    const list = (roles || []).map(quote).join(',');
    return `role.in.(${list}),roles.ov.{${list}}`;
};

module.exports = { anyRole };
