import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/services/authService.js';
import { createConsentService } from '../src/services/consentService.js';
import { createEmotionService } from '../src/services/emotionService.js';

const config = {
  nodeEnv: 'test',
  isProduction: false,
  corsOrigin: 'http://localhost:5173',
  jwt: { secret: 'secreto-de-pruebas-con-mas-de-32-caracteres!!', expiresIn: '2h' },
  bcryptCost: 4,
  authRateLimitMax: 1000
};

function createUserRepository() {
  const rows = [];
  let nextId = 1;
  return {
    rows,
    async findByCorreo(correo) {
      return rows.find((row) => row.correo === correo) ?? null;
    },
    async findActiveById(idUsuario) {
      const row = rows.find((item) => item.idUsuario === idUsuario && item.estado);
      return row ? { idUsuario: row.idUsuario, nombre: row.nombre, correo: row.correo } : null;
    },
    async create({ nombre, correo, passwordHash }) {
      const row = { idUsuario: nextId++, nombre, correo, passwordHash, estado: true };
      rows.push(row);
      return { idUsuario: row.idUsuario, nombre, correo };
    },
    reset() {
      rows.length = 0;
      nextId = 1;
    }
  };
}

function createConsentRepository() {
  const rows = [];
  let nextId = 1;
  const policy = {
    idPolitica: 1,
    version: '1.0',
    contenido: 'Aviso de privacidad del registro emocional de MenteConecta, versión 1.0.'
  };
  return {
    rows,
    async findCurrentPolicy() {
      return policy;
    },
    async findConsent({ idUsuario, idPolitica, finalidad }) {
      return rows
        .filter((row) => row.idUsuario === idUsuario && row.idPolitica === idPolitica && row.finalidad === finalidad)
        .sort((a, b) => b.idConsentimiento - a.idConsentimiento)[0] ?? null;
    },
    async recordAcceptance({ idUsuario, idPolitica, finalidad }) {
      const existing = await this.findConsent({ idUsuario, idPolitica, finalidad });
      if (existing?.aceptado && existing.revocadoEn === null) return null;
      const row = {
        idConsentimiento: nextId++,
        idUsuario,
        idPolitica,
        finalidad,
        aceptado: true,
        fechaAceptacion: new Date(),
        revocadoEn: null
      };
      rows.push(row);
      return { idConsentimiento: row.idConsentimiento };
    },
    reset() {
      rows.length = 0;
      nextId = 1;
    }
  };
}

function createEmotionRepository() {
  const rows = [];
  let nextId = 1;
  return {
    rows,
    async create({ idUsuario, idConsentimiento, emocion, intensidad, nota }) {
      const row = {
        idRegistro: nextId++,
        idUsuario,
        idConsentimiento,
        emocion,
        intensidad,
        nota,
        fecha: new Date()
      };
      rows.push(row);
      return row;
    },
    async findAllByUser(idUsuario) {
      return rows
        .filter((row) => row.idUsuario === idUsuario)
        .sort((a, b) => b.fecha - a.fecha || b.idRegistro - a.idRegistro)
        .map(({ idRegistro, emocion, intensidad, nota, fecha }) => ({
          idRegistro, emocion, intensidad, nota, fecha
        }));
    },
    async deleteByUser({ idRegistro, idUsuario }) {
      const index = rows.findIndex((row) => row.idRegistro === idRegistro && row.idUsuario === idUsuario);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
    reset() {
      rows.length = 0;
      nextId = 1;
    }
  };
}

async function startServer() {
  const usuarios = createUserRepository();
  const consentimientos = createConsentRepository();
  const emociones = createEmotionRepository();
  const authService = createAuthService({ usuarios, config });
  const consentService = createConsentService({ consentimientos });
  const emotionService = createEmotionService({ emociones, consentService });
  const app = createApp({ authService, consentService, emotionService, config });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, text, json: text ? JSON.parse(text) : null };
  };
  return { server, call, usuarios, consentimientos, emociones };
}

const userData = (correo) => ({ nombre: 'Ana Pérez', correo, password: 'UnaClaveSegura123!' });
const validRecord = { emocion: 'Calma', intensidad: 3, nota: 'Pausa breve' };

describe('API de consentimiento y registro emocional', () => {
  let harness;
  let token;

  before(async () => {
    harness = await startServer();
  });
  after(() => harness.server.close());
  beforeEach(async () => {
    harness.usuarios.reset();
    harness.consentimientos.reset();
    harness.emociones.reset();
    const response = await harness.call('/auth/register', { method: 'POST', body: userData('ana@correo.com') });
    token = response.json.token;
  });

  test('rechaza las rutas privadas cuando falta el JWT', async () => {
    assert.equal((await harness.call('/consent/status')).status, 401);
    assert.equal((await harness.call('/consent/accept', { method: 'POST', body: { aceptado: true } })).status, 401);
    assert.equal((await harness.call('/emotions')).status, 401);
    assert.equal((await harness.call('/emotions', { method: 'POST', body: validRecord })).status, 401);
    assert.equal((await harness.call('/emotions/1', { method: 'DELETE' })).status, 401);
  });

  test('invalida JWT de una cuenta deshabilitada también en las rutas del módulo', async () => {
    harness.usuarios.rows[0].estado = false;
    assert.equal((await harness.call('/consent/status', { token })).status, 401);
    assert.equal((await harness.call('/emotions', { token })).status, 401);
  });

  test('muestra el consentimiento pendiente y la política vigente del registro emocional', async () => {
    const response = await harness.call('/consent/status', { token });
    assert.equal(response.status, 200);
    assert.deepEqual(response.json.consentimiento, {
      finalidad: 'REGISTRO_EMOCIONAL',
      aceptado: false,
      valido: false,
      fechaAceptacion: null,
      revocadoEn: null,
      version: '1.0'
    });
    assert.equal(response.json.politica.esBorrador, false);
    assert.match(response.json.politica.contenido, /Aviso de privacidad/);
  });

  test('no registra consentimiento sin confirmación explícita y guarda el aceptado para el usuario del JWT', async () => {
    assert.equal((await harness.call('/consent/accept', { method: 'POST', token, body: {} })).status, 400);
    assert.equal((await harness.call('/consent/accept', { method: 'POST', token, body: { aceptado: false } })).status, 400);
    assert.equal(harness.consentimientos.rows.length, 0);

    const response = await harness.call('/consent/accept', {
      method: 'POST',
      token,
      body: { aceptado: true, idUsuario: 999 }
    });
    assert.equal(response.status, 400);
    assert.equal(harness.consentimientos.rows.length, 0);

    const accepted = await harness.call('/consent/accept', {
      method: 'POST',
      token,
      body: { aceptado: true }
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.json.consentimiento.valido, true);
    assert.equal(harness.consentimientos.rows[0].idUsuario, 1);
    assert.equal(harness.consentimientos.rows[0].finalidad, 'REGISTRO_EMOCIONAL');
    assert.equal(typeof harness.consentimientos.rows[0].fechaAceptacion, 'object');

    const duplicateAcceptance = await harness.call('/consent/accept', {
      method: 'POST',
      token,
      body: { aceptado: true }
    });
    assert.equal(duplicateAcceptance.status, 200);
    assert.equal(harness.consentimientos.rows.length, 1);
  });

  test('bloquea el registro emocional si falta consentimiento vigente', async () => {
    const response = await harness.call('/emotions', { method: 'POST', token, body: validRecord });
    assert.equal(response.status, 403);
    assert.equal(harness.emociones.rows.length, 0);
  });

  test('guarda una emoción válida vinculada al usuario y consentimiento autenticados', async () => {
    await harness.call('/consent/accept', { method: 'POST', token, body: { aceptado: true } });
    const response = await harness.call('/emotions', { method: 'POST', token, body: validRecord });
    assert.equal(response.status, 201);
    assert.equal(response.json.registro.emocion, 'Calma');
    assert.equal(response.json.registro.intensidad, 3);
    assert.equal(response.json.registro.nota, 'Pausa breve');
    assert.equal(typeof response.json.registro.fecha, 'string');
    assert.equal(harness.emociones.rows[0].idUsuario, 1);
    assert.equal(harness.emociones.rows[0].idConsentimiento, 1);
  });

  test('rechaza emoción desconocida, intensidades inválidas, nota inválida y campos manipulados', async () => {
    await harness.call('/consent/accept', { method: 'POST', token, body: { aceptado: true } });
    const invalidBodies = [
      { ...validRecord, emocion: 'Estrés' },
      { ...validRecord, intensidad: 0 },
      { ...validRecord, intensidad: 6 },
      { ...validRecord, intensidad: 1.5 },
      { ...validRecord, intensidad: '3' },
      { ...validRecord, nota: 'x'.repeat(1001) },
      { ...validRecord, nota: 42 },
      { ...validRecord, idUsuario: 999 },
      { ...validRecord, idConsentimiento: 999 }
    ];
    for (const body of invalidBodies) {
      const response = await harness.call('/emotions', { method: 'POST', token, body });
      assert.equal(response.status, 400, JSON.stringify(body));
    }
    assert.equal(harness.emociones.rows.length, 0);
  });

  test('el historial se limita al usuario autenticado', async () => {
    await harness.call('/consent/accept', { method: 'POST', token, body: { aceptado: true } });
    await harness.call('/emotions', { method: 'POST', token, body: validRecord });
    await harness.call('/emotions', {
      method: 'POST',
      token,
      body: { emocion: 'Tristeza', intensidad: 2 }
    });

    const secondUser = await harness.call('/auth/register', {
      method: 'POST',
      body: userData('luis@correo.com')
    });
    await harness.call('/consent/accept', {
      method: 'POST',
      token: secondUser.json.token,
      body: { aceptado: true }
    });
    await harness.call('/emotions', {
      method: 'POST',
      token: secondUser.json.token,
      body: { emocion: 'Alegría', intensidad: 4 }
    });

    const response = await harness.call('/emotions', { token });
    assert.equal(response.status, 200);
    assert.equal(response.json.registros.length, 2);
    assert.equal(response.json.registros[0].emocion, 'Tristeza');
    assert.equal(response.json.registros[0].idRegistro, 2);
    assert.equal(response.json.registros[1].idRegistro, 1);
  });

  test('impide eliminar un registro ajeno y permite eliminar el propio', async () => {
    await harness.call('/consent/accept', { method: 'POST', token, body: { aceptado: true } });
    const created = await harness.call('/emotions', { method: 'POST', token, body: validRecord });
    const idRegistro = created.json.registro.idRegistro;
    const otherUser = await harness.call('/auth/register', {
      method: 'POST',
      body: userData('luis@correo.com')
    });

    const forbiddenDelete = await harness.call(`/emotions/${idRegistro}`, {
      method: 'DELETE',
      token: otherUser.json.token
    });
    assert.equal(forbiddenDelete.status, 404);
    assert.equal(harness.emociones.rows.length, 1);

    const ownDelete = await harness.call(`/emotions/${idRegistro}`, { method: 'DELETE', token });
    assert.equal(ownDelete.status, 204);
    assert.equal(harness.emociones.rows.length, 0);
    assert.equal((await harness.call('/emotions/not-an-id', { method: 'DELETE', token })).status, 400);
  });
});
