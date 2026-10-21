import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { isDuplicateKeyError } from '../db/usuarioRepository.js';

const JWT_ALGORITHM = 'HS256';
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';

/** Solo estos campos salen hacia el cliente: jamás passwordHash ni estado. */
const toPublicUser = (row) => ({
  idUsuario: row.idUsuario,
  nombre: row.nombre,
  correo: row.correo
});

/**
 * Lógica de autenticación. Recibe sus dependencias (repositorio y config)
 * para poder probarla sin SQL Server.
 */
export function createAuthService({ usuarios, config }) {
  // Hash "señuelo": si el correo no existe, igual se ejecuta bcrypt.compare para que
  // el tiempo de respuesta no delate si el correo está registrado.
  const dummyHash = bcrypt.hash('contrasena-senuelo-no-valida', config.bcryptCost);

  const signToken = (idUsuario) =>
    jwt.sign({ sub: String(idUsuario) }, config.jwt.secret, {
      algorithm: JWT_ALGORITHM,
      expiresIn: config.jwt.expiresIn
    });

  return {
    /** @param {{nombre:string, correo:string, password:string}} data ya validado y normalizado */
    async register({ nombre, correo, password }) {
      const passwordHash = await bcrypt.hash(password, config.bcryptCost);
      let created;
      try {
        created = await usuarios.create({ nombre, correo, passwordHash });
      } catch (err) {
        // La restricción UNIQUE de SQL Server decide (también ante peticiones simultáneas).
        if (isDuplicateKeyError(err)) {
          throw new AppError(409, 'Ya existe una cuenta con ese correo.');
        }
        throw err;
      }
      return { user: toPublicUser(created), token: signToken(created.idUsuario) };
    },

    /** @param {{correo:string, password:string}} data ya validado y normalizado */
    async login({ correo, password }) {
      const row = await usuarios.findByCorreo(correo);

      if (!row) {
        await bcrypt.compare(password, await dummyHash);
        throw new AppError(401, INVALID_CREDENTIALS);
      }
      const passwordOk = await bcrypt.compare(password, row.passwordHash);
      if (!passwordOk) throw new AppError(401, INVALID_CREDENTIALS);

      // El estado se revisa DESPUÉS de verificar la contraseña: así el 403 solo lo ve
      // quien conoce la clave y no se puede usar para descubrir correos registrados.
      if (!row.estado) {
        throw new AppError(403, 'Tu cuenta está deshabilitada. Contacta al equipo de MenteConecta.');
      }
      return { user: toPublicUser(row), token: signToken(row.idUsuario) };
    },

    /** Datos actuales del usuario ACTIVO identificado por el JWT. */
    async getMe(idUsuario) {
      const row = await usuarios.findActiveById(idUsuario);
      if (!row) throw new AppError(401, 'Sesión no válida.');
      return { user: toPublicUser(row) };
    },

    /** Valida firma, algoritmo y expiración. Devuelve el id numérico del usuario. */
    verifyToken(token) {
      try {
        const payload = jwt.verify(token, config.jwt.secret, { algorithms: [JWT_ALGORITHM] });
        const idUsuario = Number(payload.sub);
        if (!Number.isInteger(idUsuario) || idUsuario <= 0) throw new Error('sub inválido');
        return idUsuario;
      } catch {
        throw new AppError(401, 'Sesión no válida o vencida.');
      }
    }
  };
}
