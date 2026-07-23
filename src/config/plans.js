// Límites de miembros por plan. null = ilimitado. Debe coincidir con src/lib/plans.ts del front.
const PLAN_LIMITS = { inicial: 100, estandar: 250, avanzado: 500, premium: 750, corporativo: null };
const PACK_SIZE = 25;
// Capacidad efectiva = límite del plan + packs*25. null si el plan es ilimitado o desconocido (sin límite).
function effectiveLimit(plan, packs) {
  const base = PLAN_LIMITS[plan];
  if (base == null) return null;
  return base + (Number(packs) || 0) * PACK_SIZE;
}

// Corporativo es el único plan sin precio fijo: price_monthly en la tabla `plans` guarda el
// piso ($60.000), y a partir de CORPORATIVO_INCLUDED_MEMBERS se suma un adicional por cada
// miembro de más. Los demás planes cobran siempre price_monthly tal cual está en la tabla.
const CORPORATIVO_INCLUDED_MEMBERS = 750;
const CORPORATIVO_PRICE_PER_EXTRA_MEMBER = 60;

// Precio mensual efectivo de un plan según la cantidad de miembros actual.
function monthlyPrice(planValue, basePriceMonthly, memberCount) {
  const base = Number(basePriceMonthly) || 0;
  if (planValue === 'corporativo') {
    return base + Math.max(0, (Number(memberCount) || 0) - CORPORATIVO_INCLUDED_MEMBERS) * CORPORATIVO_PRICE_PER_EXTRA_MEMBER;
  }
  return base;
}

module.exports = {
  PLAN_LIMITS,
  PACK_SIZE,
  effectiveLimit,
  monthlyPrice,
  CORPORATIVO_INCLUDED_MEMBERS,
  CORPORATIVO_PRICE_PER_EXTRA_MEMBER,
};
