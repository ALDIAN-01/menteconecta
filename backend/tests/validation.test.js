import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/utils/AppError.js';
import { validateLogin, validateRegister } from '../src/validation/authValidation.js';

const validBody = { nombre: 'Ana Pérez', correo: 'ana@correo.com', password: 'UnaClaveSegura123!' };

const errorsOf = (fn) => {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 400);
    return err.errors;
  }
  assert.fail('Se esperaba un AppError 400');
};

test('register: recorta nombre y correo y pasa el correo a minúsculas', () => {
  const out = validateRegister({ ...validBody, nombre: '  Ana Pérez  ', correo: '  ANA@Correo.COM ' });
  assert.equal(out.nombre, 'Ana Pérez');
  assert.equal(out.correo, 'ana@correo.com');
});

test('register: ignora campos extra (idUsuario, estado, passwordHash)', () => {
  const out = validateRegister({ ...validBody, idUsuario: 99, estado: 0, passwordHash: 'x' });
  assert.deepEqual(Object.keys(out).sort(), ['correo', 'nombre', 'password']);
});

test('register: rechaza nombre vacío, de 1 carácter o de más de 100', () => {
  assert.ok(errorsOf(() => validateRegister({ ...validBody, nombre: '   ' })).nombre);
  assert.ok(errorsOf(() => validateRegister({ ...validBody, nombre: 'A' })).nombre);
  assert.ok(errorsOf(() => validateRegister({ ...validBody, nombre: 'A'.repeat(101) })).nombre);
  assert.equal(validateRegister({ ...validBody, nombre: 'A'.repeat(100) }).nombre.length, 100);
});

test('register: rechaza correos inválidos o de más de 254 caracteres', () => {
  for (const correo of ['', 'sin-arroba', 'a@b', 'a b@c.com', `${'a'.repeat(250)}@x.co`]) {
    assert.ok(errorsOf(() => validateRegister({ ...validBody, correo })).correo, `"${correo}"`);
  }
});

test('register: la contraseña exige 12 caracteres mínimo y 72 bytes máximo', () => {
  assert.ok(errorsOf(() => validateRegister({ ...validBody, password: 'Corta1!' })).password);
  assert.ok(errorsOf(() => validateRegister({ ...validBody, password: 'a'.repeat(11) })).password);
  assert.equal(validateRegister({ ...validBody, password: 'a'.repeat(12) }).password.length, 12);
  assert.ok(errorsOf(() => validateRegister({ ...validBody, password: 'a'.repeat(73) })).password);
  assert.ok(errorsOf(() => validateRegister({ ...validBody, password: 'ñ'.repeat(40) })).password); // 80 bytes
});

test('register: rechaza tipos que no son texto y cuerpos que no son objetos', () => {
  assert.ok(errorsOf(() => validateRegister({ nombre: 123, correo: ['a@b.co'], password: {} })).nombre);
  assert.ok(errorsOf(() => validateRegister(null)).body);
  assert.ok(errorsOf(() => validateRegister([])).body);
  assert.ok(errorsOf(() => validateRegister(undefined)).body);
});

test('register: informa todos los campos inválidos a la vez', () => {
  const errors = errorsOf(() => validateRegister({}));
  assert.deepEqual(Object.keys(errors).sort(), ['correo', 'nombre', 'password']);
});

test('login: normaliza el correo y no aplica el mínimo de 12 a la contraseña', () => {
  const out = validateLogin({ correo: ' ANA@Correo.com ', password: 'corta' });
  assert.deepEqual(out, { correo: 'ana@correo.com', password: 'corta' });
});

test('login: exige correo válido y contraseña presente', () => {
  assert.ok(errorsOf(() => validateLogin({ correo: 'x', password: 'abc' })).correo);
  assert.ok(errorsOf(() => validateLogin({ correo: 'a@b.co', password: '' })).password);
  assert.ok(errorsOf(() => validateLogin({ correo: 'a@b.co' })).password);
  assert.ok(errorsOf(() => validateLogin({ correo: 'a@b.co', password: 'a'.repeat(73) })).password);
});
