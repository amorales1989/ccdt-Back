// Límites de miembros por plan. null = ilimitado. Debe coincidir con src/lib/plans.ts del front.
const PLAN_LIMITS = { inicial: 100, estandar: 250, avanzado: 500, premium: 750, corporativo: null };
const PACK_SIZE = 25;
// Capacidad efectiva = límite del plan + packs*25. null si el plan es ilimitado o desconocido (sin límite).
function effectiveLimit(plan, packs) {
  const base = PLAN_LIMITS[plan];
  if (base == null) return null;
  return base + (Number(packs) || 0) * PACK_SIZE;
}
module.exports = { PLAN_LIMITS, PACK_SIZE, effectiveLimit };
