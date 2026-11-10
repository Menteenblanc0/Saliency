import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, reconcileOrder } from '../netlify/functions/utils/participants-utils';

test('normalizeEmail: limpia espacios y convierte a minúsculas', () => {
  const input = '  Usuario.Test@UniMagdalena.edu.co  ';
  const expected = 'usuario.test@unimagdalena.edu.co';
  assert.equal(normalizeEmail(input), expected);
});

test('normalizeEmail: trunca correos de más de 254 caracteres', () => {
  const longEmail = 'a'.repeat(260) + '@domain.com';
  const result = normalizeEmail(longEmail);
  assert.equal(result.length, 254);
});

test('reconcileOrder: mantiene el orden de imágenes existentes y activas', () => {
  const saved = ['img-1', 'img-2', 'img-3'];
  const active = ['img-1', 'img-2', 'img-3'];
  const result = reconcileOrder(saved, active);
  assert.deepEqual(result, ['img-1', 'img-2', 'img-3']);
});

test('reconcileOrder: elimina del orden imágenes inactivas o borradas', () => {
  const saved = ['img-1', 'img-2', 'img-3', 'img-4'];
  const active = ['img-1', 'img-3'];
  const result = reconcileOrder(saved, active);
  assert.deepEqual(result, ['img-1', 'img-3']);
});

test('reconcileOrder: añade imágenes nuevas al final del orden', () => {
  const saved = ['img-1', 'img-2'];
  const active = ['img-1', 'img-2', 'img-new'];
  const result = reconcileOrder(saved, active);
  assert.equal(result.length, 3);
  assert.equal(result[0], 'img-1');
  assert.equal(result[1], 'img-2');
  assert.equal(result[2], 'img-new');
});

test('reconcileOrder: maneja lista guardada vacía', () => {
  const saved: string[] = [];
  const active = ['img-1', 'img-2'];
  const result = reconcileOrder(saved, active);
  assert.equal(result.length, 2);
  assert.ok(result.includes('img-1'));
  assert.ok(result.includes('img-2'));
});
