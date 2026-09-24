const test = require('node:test');
const assert = require('node:assert/strict');
const {
    PLAN_LIMITS,
    PACK_SIZE,
    effectiveLimit,
    monthlyPrice,
    CORPORATIVO_INCLUDED_MEMBERS,
    CORPORATIVO_PRICE_PER_EXTRA_MEMBER,
} = require('../../src/config/plans');

test('effectiveLimit: límite del plan sin packs', () => {
    assert.equal(effectiveLimit('inicial', 0), 100);
    assert.equal(effectiveLimit('estandar', 0), 250);
    assert.equal(effectiveLimit('avanzado', 0), 500);
    assert.equal(effectiveLimit('premium', 0), 750);
});

test('effectiveLimit: cada pack suma PACK_SIZE miembros', () => {
    assert.equal(effectiveLimit('inicial', 3), 100 + 3 * PACK_SIZE);
    assert.equal(effectiveLimit('premium', 10), 750 + 10 * PACK_SIZE);
});

test('effectiveLimit: corporativo es ilimitado aunque tenga packs', () => {
    assert.equal(effectiveLimit('corporativo', 0), null);
    assert.equal(effectiveLimit('corporativo', 5), null);
});

test('effectiveLimit: plan desconocido o ausente no impone límite', () => {
    assert.equal(effectiveLimit(undefined, 0), null);
    assert.equal(effectiveLimit(null, 2), null);
    assert.equal(effectiveLimit('plan_que_no_existe', 2), null);
});

test('effectiveLimit: packs nulo/indefinido/string no rompe el cálculo', () => {
    assert.equal(effectiveLimit('inicial', null), 100);
    assert.equal(effectiveLimit('inicial', undefined), 100);
    assert.equal(effectiveLimit('inicial', '2'), 150);
});

test('monthlyPrice: los planes con precio fijo devuelven el precio de la tabla', () => {
    assert.equal(monthlyPrice('inicial', 20000, 5000), 20000);
    assert.equal(monthlyPrice('premium', 60000, 10000), 60000);
});

test('monthlyPrice: corporativo cobra el piso hasta los miembros incluidos', () => {
    assert.equal(monthlyPrice('corporativo', 85000, 0), 85000);
    assert.equal(monthlyPrice('corporativo', 85000, CORPORATIVO_INCLUDED_MEMBERS), 85000);
});

test('monthlyPrice: corporativo suma un adicional por miembro excedente', () => {
    const extra = 50;
    assert.equal(
        monthlyPrice('corporativo', 85000, CORPORATIVO_INCLUDED_MEMBERS + extra),
        85000 + extra * CORPORATIVO_PRICE_PER_EXTRA_MEMBER
    );
});

test('monthlyPrice: precio base ausente no genera NaN', () => {
    assert.equal(monthlyPrice('inicial', null, 10), 0);
    assert.equal(monthlyPrice('corporativo', undefined, 0), 0);
});

test('PLAN_LIMITS no cambia sin querer (contrato compartido con el front)', () => {
    assert.deepEqual(PLAN_LIMITS, {
        inicial: 100,
        estandar: 250,
        avanzado: 500,
        premium: 750,
        corporativo: null,
    });
    assert.equal(PACK_SIZE, 25);
});
