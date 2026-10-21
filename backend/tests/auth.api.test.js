// Pruebas HTTP del módulo de autenticación con un repositorio EN MEMORIA.
// No necesitan SQL Server: validan rutas, validaciones, bcrypt, JWT y manejo de errores.
// Lo que NO cubren (consultas SQL reales y la restricción UNIQUE) se prueba a mano: ver README.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/services/authService.js';

const config = {
  nodeEnv: 'test',
  isProduction: false,
  corsOrigin: 'http://localhost:5173',
  jwt: { secret: 'secreto-de-pruebas-con-mas-de-32-caracteres!!', expiresIn: '2h' },
  bcryptCost: 4, // mínimo de bcrypt: solo para que las pruebas sean rápidas
  authRateLimitMax: 1000
};

/** Imita dbo.Usuario: UNIQUE sobre correo, identity incremental, estado DEFAULT 1. */
function createFakeRepository() {
  const rows = [];
  let nextId = 1;
  return {
    rows,
    async findByCorreo(correo) {
      return rows.find((r) => r.correo === correo) ?? null;
    },
    async findActiveById(id) {
      const row = rows.find((r) => r.idUsuario === id && r.estado);
      return row ? { idUsuario: row.idUsuario, nombre: row.nombre, correo: row.correo } : null;
    },
    async create({ nombre, correo, passwordHash }) {
      if (rows.some((r) => r.correo === correo)) {
        const err = new Error('Violation of UNIQUE KEY constraint UQ_Usuario_correo');
        err.number = 2627;
        throw err;
      }
      const row = { idUsuario: nextId++, nombre, correo, passwordHash, estado: true };
      rows.push(row);
      return { idUsuario: row.idUsuario, nombre, correo };
    }
  };
}

async function startServer(repo, cfg = config) {
  const app = createApp({ authService: createAuthService({ usuarios: repo, config: cfg }), config: cfg });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, raw } = {}) => {
    const headers = {};
    if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined)
    });
    const text = await res.text();
    return { status: res.status, text, json: text ? JSON.parse(text) : null };
  };
  return { server, call };
}

const ana = { nombre: 'Ana Pérez', correo: 'ana@correo.com', password: 'UnaClaveSegura123!' };

describe('API /api/auth', () => {
  let repo;
  let server;
  let call;

  before(async () => {
    repo = createFakeRepository();
    ({ server, call } = await startServer(repo));
  });
  after(() => server.close());
  beforeEach(() => {
    repo.rows.length = 0;
  });

  describe('POST /register', () => {
    test('201 con el formato del contrato y sin passwordHash', async () => {
      const res = await call('/auth/register', { method: 'POST', body: ana });
      assert.equal(res.status, 201);
      assert.equal(res.json.message, 'Cuenta creada correctamente');
      assert.deepEqual(res.json.user, { idUsuario: 1, nombre: 'Ana Pérez', correo: 'ana@correo.com' });
      assert.equal(typeof res.json.token, 'string');
      assert.ok(!/passwordHash|password"/i.test(res.text), 'la respuesta no debe incluir contraseñas');
    });

    test('guarda un hash bcrypt, nunca la contraseña original', async () => {
      await call('/auth/register', { method: 'POST', body: ana });
      const stored = repo.rows[0].passwordHash;
      assert.match(stored, /^\$2[aby]\$\d{2}\$/);
      assert.notEqual(stored, ana.password);
      assert.ok(!stored.includes(ana.password));
    });

    test('el token trae sub = idUsuario y vence (exp)', async () => {
      const res = await call('/auth/register', { method: 'POST', body: ana });
      const payload = jwt.verify(res.json.token, config.jwt.secret);
      assert.equal(payload.sub, '1');
      assert.ok(payload.exp > payload.iat);
    });

    test('normaliza el correo (recorta y minúsculas)', async () => {
      const res = await call('/auth/register', {
        method: 'POST',
        body: { ...ana, nombre: '  Ana Pérez ', correo: '  ANA@Correo.COM ' }
      });
      assert.equal(res.status, 201);
      assert.equal(res.json.user.correo, 'ana@correo.com');
      assert.equal(res.json.user.nombre, 'Ana Pérez');
    });

    test('409 si el correo ya existe, aunque cambien mayúsculas/minúsculas', async () => {
      await call('/auth/register', { method: 'POST', body: ana });
      const res = await call('/auth/register', { method: 'POST', body: { ...ana, correo: 'ANA@CORREO.COM' } });
      assert.equal(res.status, 409);
      assert.equal(repo.rows.length, 1);
    });

    test('400 con errores por campo si los datos son inválidos', async () => {
      const res = await call('/auth/register', {
        method: 'POST',
        body: { nombre: 'A', correo: 'nope', password: 'corta' }
      });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.json.errors).sort(), ['correo', 'nombre', 'password']);
      assert.equal(repo.rows.length, 0);
    });

    test('ignora idUsuario, estado y passwordHash enviados por el cliente', async () => {
      const res = await call('/auth/register', {
        method: 'POST',
        body: { ...ana, idUsuario: 999, estado: false, passwordHash: 'hash-falso' }
      });
      assert.equal(res.status, 201);
      assert.equal(res.json.user.idUsuario, 1);
      assert.equal(repo.rows[0].estado, true);
      assert.notEqual(repo.rows[0].passwordHash, 'hash-falso');
    });

    test('400 si el JSON está mal formado', async () => {
      const res = await call('/auth/register', { method: 'POST', raw: '{"nombre": ' });
      assert.equal(res.status, 400);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      await call('/auth/register', { method: 'POST', body: ana });
    });

    test('200 con usuario y token', async () => {
      const res = await call('/auth/login', { method: 'POST', body: { correo: ana.correo, password: ana.password } });
      assert.equal(res.status, 200);
      assert.equal(res.json.message, 'Inicio de sesión correcto');
      assert.deepEqual(res.json.user, { idUsuario: 1, nombre: 'Ana Pérez', correo: 'ana@correo.com' });
      assert.equal(typeof res.json.token, 'string');
      assert.ok(!/passwordHash/i.test(res.text));
    });

    test('el correo se normaliza también al iniciar sesión', async () => {
      const res = await call('/auth/login', { method: 'POST', body: { correo: ' ANA@correo.com ', password: ana.password } });
      assert.equal(res.status, 200);
    });

    test('401 con contraseña incorrecta y 401 con correo inexistente: mismo mensaje', async () => {
      const wrongPass = await call('/auth/login', { method: 'POST', body: { correo: ana.correo, password: 'OtraClave12345!' } });
      const noUser = await call('/auth/login', { method: 'POST', body: { correo: 'nadie@correo.com', password: 'OtraClave12345!' } });
      assert.equal(wrongPass.status, 401);
      assert.equal(noUser.status, 401);
      assert.equal(wrongPass.json.message, noUser.json.message);
    });

    test('403 si la cuenta está deshabilitada y la contraseña es correcta', async () => {
      repo.rows[0].estado = false;
      const res = await call('/auth/login', { method: 'POST', body: { correo: ana.correo, password: ana.password } });
      assert.equal(res.status, 403);
      assert.equal(res.json.token, undefined);
    });

    test('cuenta deshabilitada + contraseña incorrecta sigue dando 401 (no revela el estado)', async () => {
      repo.rows[0].estado = false;
      const res = await call('/auth/login', { method: 'POST', body: { correo: ana.correo, password: 'OtraClave12345!' } });
      assert.equal(res.status, 401);
    });

    test('400 si faltan datos', async () => {
      const res = await call('/auth/login', { method: 'POST', body: { correo: ana.correo } });
      assert.equal(res.status, 400);
      assert.ok(res.json.errors.password);
    });
  });

  describe('GET /me', () => {
    let token;
    beforeEach(async () => {
      const res = await call('/auth/register', { method: 'POST', body: ana });
      token = res.json.token;
    });

    test('200 con los datos actuales del usuario', async () => {
      const res = await call('/auth/me', { token });
      assert.equal(res.status, 200);
      assert.deepEqual(res.json, { user: { idUsuario: 1, nombre: 'Ana Pérez', correo: 'ana@correo.com' } });
    });

    test('401 sin token, con esquema incorrecto o con token vacío', async () => {
      assert.equal((await call('/auth/me')).status, 401);
      assert.equal((await call('/auth/me', { token: `Basic ${token}` })).status, 401);
      assert.equal((await call('/auth/me', { token: 'Bearer ' })).status, 401);
    });

    test('401 con token alterado', async () => {
      const [h, p, s] = token.split('.');
      const forgedPayload = Buffer.from(JSON.stringify({ sub: '2', iat: 1, exp: 9999999999 })).toString('base64url');
      assert.equal((await call('/auth/me', { token: `${h}.${forgedPayload}.${s}` })).status, 401);
      assert.equal((await call('/auth/me', { token: `${h}.${p}.${s.slice(0, -2)}xx` })).status, 401);
      assert.equal((await call('/auth/me', { token: 'basura' })).status, 401);
    });

    test('401 con token vencido', async () => {
      const expired = jwt.sign({ sub: '1' }, config.jwt.secret, { expiresIn: -10 });
      assert.equal((await call('/auth/me', { token: expired })).status, 401);
    });

    test('401 con token firmado con otro secreto o con alg "none"', async () => {
      const otherSecret = jwt.sign({ sub: '1' }, 'otro-secreto-distinto-de-32-caracteres-o-mas', { expiresIn: '1h' });
      assert.equal((await call('/auth/me', { token: otherSecret })).status, 401);
      const none = jwt.sign({ sub: '1' }, '', { algorithm: 'none' });
      assert.equal((await call('/auth/me', { token: none })).status, 401);
    });

    test('401 si el usuario del token fue deshabilitado o ya no existe', async () => {
      repo.rows[0].estado = false;
      assert.equal((await call('/auth/me', { token })).status, 401);
      repo.rows.length = 0;
      assert.equal((await call('/auth/me', { token })).status, 401);
    });

    test('ignora un idUsuario enviado por query: manda el del token', async () => {
      await call('/auth/register', { method: 'POST', body: { nombre: 'Luis Gómez', correo: 'luis@correo.com', password: ana.password } });
      const res = await call('/auth/me?idUsuario=2', { token });
      assert.equal(res.json.user.idUsuario, 1);
    });
  });

  describe('Errores generales', () => {
    test('404 en JSON para rutas inexistentes', async () => {
      const res = await call('/no-existe');
      assert.equal(res.status, 404);
    });

    test('500 genérico: no filtra el mensaje interno ni el stack', async () => {
      const broken = createFakeRepository();
      broken.findByCorreo = async () => {
        throw new Error('Login failed for user sa @ SERVIDOR-SECRETO');
      };
      const { server: s, call: c } = await startServer(broken);
      const originalError = console.error;
      console.error = () => {}; // silencia el log esperado
      try {
        const res = await c('/auth/login', { method: 'POST', body: { correo: ana.correo, password: ana.password } });
        assert.equal(res.status, 500);
        assert.ok(!res.text.includes('SERVIDOR-SECRETO'));
        assert.ok(!/stack|at .*\.js/.test(res.text));
      } finally {
        console.error = originalError;
        s.close();
      }
    });

    test('429 al superar el límite de intentos', async () => {
      const { server: s, call: c } = await startServer(createFakeRepository(), { ...config, authRateLimitMax: 2 });
      try {
        const body = { correo: 'x@correo.com', password: 'cualquiera' };
        assert.equal((await c('/auth/login', { method: 'POST', body })).status, 401);
        assert.equal((await c('/auth/login', { method: 'POST', body })).status, 401);
        assert.equal((await c('/auth/login', { method: 'POST', body })).status, 429);
      } finally {
        s.close();
      }
    });
  });
});
