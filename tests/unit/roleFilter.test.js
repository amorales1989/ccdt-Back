const test = require('node:test');
const assert = require('node:assert/strict');
const { anyRole } = require('../../src/utils/roleFilter');

test('anyRole: matchea el rol primario o el array de roles', () => {
    assert.equal(anyRole(['admin']), 'role.in.("admin"),roles.ov.{"admin"}');
});

test('anyRole: varios roles en una sola lista', () => {
    assert.equal(
        anyRole(['conserje', 'admin']),
        'role.in.("conserje","admin"),roles.ov.{"conserje","admin"}'
    );
});

test('anyRole: comilla los roles con punto y guión (romperían la lista de PostgREST)', () => {
    assert.equal(
        anyRole(['secr.-calendario']),
        'role.in.("secr.-calendario"),roles.ov.{"secr.-calendario"}'
    );
});

test('anyRole: escapa las comillas dobles del valor', () => {
    assert.equal(anyRole(['ro"le']), 'role.in.("ro\\"le"),roles.ov.{"ro\\"le"}');
});

test('anyRole: lista vacía o ausente no rompe', () => {
    assert.equal(anyRole([]), 'role.in.(),roles.ov.{}');
    assert.equal(anyRole(undefined), 'role.in.(),roles.ov.{}');
});
