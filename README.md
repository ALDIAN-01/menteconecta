# MenteConecta — Módulo 1: registro e inicio de sesión

Piloto de bienestar emocional para estudiantes del TdeA. Este repositorio contiene **solo el Módulo 1**
(registro, inicio de sesión y consulta del usuario autenticado). Gemini, registros emocionales, biblioteca,
consentimiento, etc. son módulos posteriores.

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite, JavaScript, CSS plano (Tailwind **no** estaba configurado, se evitó añadirlo) |
| Backend | Node.js (≥ 20) + Express, módulos ES (`import`/`export`) |
| Base de datos | SQL Server local (SSMS), paquete `mssql` |
| Seguridad | `bcrypt`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit` |

## Estructura

```
MenteConecta/
├── backend/                 API Express
│   ├── src/
│   │   ├── config/env.js            variables de entorno + validación
│   │   ├── db/pool.js               conexión a SQL Server (pool único)
│   │   ├── db/usuarioRepository.js  ÚNICO lugar con SQL (consultas parametrizadas, dbo.Usuario)
│   │   ├── validation/              reglas de validación del servidor
│   │   ├── services/authService.js  registro, login, JWT (bcrypt)
│   │   ├── controllers/ routes/ middleware/   capa HTTP delgada
│   │   ├── app.js                   arma Express (sin abrir puertos: se puede probar)
│   │   └── server.js                arranque
│   ├── tests/                       pruebas con `node:test` (repositorio en memoria)
│   ├── scripts/check-db.js          verifica la conexión desde Node
│   └── .env.example
├── frontend/                React + Vite (src/pages, components, api, validation)
├── database/01_schema_seed_MenteConecta.sql   script SQL (SIN modificar)
├── docs/                    contrato de API, MER, diagramas, capturas de Figma
└── postman/MenteConecta-Auth.postman_collection.json
```

Convención de arquitectura (para no romperla al continuar): **ruta → controlador → servicio → repositorio**.
Solo `db/*Repository.js` escribe SQL; los servicios no conocen HTTP; los controladores no conocen SQL.
Cada módulo nuevo (consentimiento, emociones…) debe añadir sus propios `*Routes/Controller/Service/Repository`
y registrarse en `backend/src/app.js`.

---

## 1. Requisitos

- **Node.js 20 o superior** (`node -v`) y npm.
- **SQL Server** (Express/Developer) + **SSMS**.
- **Postman** (para las pruebas de API) y Git.

## 2. Base de datos (SQL Server)

1. Abre **SSMS**, conéctate a tu servidor y abre `database/01_schema_seed_MenteConecta.sql`.
2. Ejecútalo completo (F5). Crea la base `MenteConecta` y sus tablas. Es repetible (idempotente).
3. Comprueba: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';` debe listar `Usuario` y las demás.
   El script **no** crea usuarios de prueba: se crean registrándose desde la app/API (así el hash es bcrypt real).

### Cómo se conecta Node (importante en Windows)

El driver `mssql` usa **autenticación SQL (usuario/contraseña)**. La autenticación de Windows integrada
**no** funciona con este driver sin añadir paquetes nativos, por lo que el equipo usa un login SQL:

1. SSMS → clic derecho en el servidor → *Properties* → *Security* → **SQL Server and Windows Authentication mode** → OK y **reinicia el servicio** de SQL Server.
2. Crea un login con permisos solo sobre esta base (cambia la contraseña):

   ```sql
   CREATE LOGIN menteconecta_app WITH PASSWORD = 'PonAquiUnaClaveLarga#2026', CHECK_POLICY = ON;
   GO
   USE MenteConecta;
   CREATE USER menteconecta_app FOR LOGIN menteconecta_app;
   ALTER ROLE db_datareader ADD MEMBER menteconecta_app;
   ALTER ROLE db_datawriter ADD MEMBER menteconecta_app;
   GO
   ```
3. Habilita **TCP/IP** en *SQL Server Configuration Manager* → *SQL Server Network Configuration* → protocolos de tu instancia (y reinicia el servicio).
4. Cada compañero puede tener nombre de instancia distinto. En `backend/.env` (ver abajo):
   - Instancia **por defecto**: `DB_SERVER=localhost`, `DB_PORT=1433`, `DB_INSTANCE=` (vacío).
   - Instancia **con nombre** (p. ej. `SQLEXPRESS`): `DB_SERVER=localhost`, `DB_INSTANCE=SQLEXPRESS` (requiere el servicio *SQL Server Browser* en ejecución). Si no, averigua el puerto fijo y usa `DB_PORT=<puerto>` con `DB_INSTANCE` vacío.
   - Certificado local autofirmado: `DB_ENCRYPT=true` y `DB_TRUST_SERVER_CERT=true` (solo desarrollo).

## 3. Backend

```bash
cd backend
npm install
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Edita `backend/.env`: rellena `DB_USER`, `DB_PASSWORD` y genera un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Verifica la conexión **antes** de arrancar:

```bash
npm run db:check      # debe imprimir "✔ Conexión correcta" y "✔ Existe la tabla dbo.Usuario"
npm run dev           # API en http://localhost:3000/api  (health: GET /api/health)
```

Si `npm run dev` no conecta, se detiene con un mensaje claro (revisa `.env`, TCP/IP y el modo de autenticación).

## 4. Frontend (otra terminal)

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

El frontend llama a `http://localhost:3000/api` (cámbialo en `frontend/.env` con `VITE_API_URL` solo si hace falta).
El origen `http://localhost:5173` debe coincidir con `CORS_ORIGIN` del backend.

## 5. Pruebas

### Automáticas (backend, **no requieren SQL Server**)

```bash
cd backend
npm test
```

Usan un repositorio en memoria que imita `dbo.Usuario` (incluida la violación UNIQUE 2627). Cubren validaciones, hash bcrypt,
JWT (alterado, vencido, otro secreto, `alg: none`), 409/401/403, `/me`, errores 500 genéricos y 429.
**No cubren** las consultas SQL reales ni el UNIQUE real de SQL Server → usa Postman (siguiente sección).

### Postman (**requieren backend + SQL Server**)

1. Postman → *Import* → `postman/MenteConecta-Auth.postman_collection.json`.
2. Con el backend corriendo, abre la colección → **Run** → ejecuta todo **en orden** (cada petición trae sus `Tests`).
   - La variable `baseUrl` es `http://localhost:3000/api`. El correo se genera único en cada ejecución.
3. Qué valida cada petición:

| # | Petición | Esperado |
|---|----------|----------|
| 1.1 | `POST /auth/register` correcto | `201`, `{message,user{idUsuario,nombre,correo},token}`, sin `passwordHash`; guarda `token` |
| 1.2 | Mismo correo en MAYÚSCULAS | `409` (no se duplica) |
| 1.3 | Nombre/correo/clave inválidos | `400` con `errors` por campo |
| 1.4 | Contraseña de 11 caracteres | `400` |
| 2.1 | `POST /auth/login` correcto | `200`, `token` |
| 2.2 | Contraseña incorrecta | `401` “Correo o contraseña incorrectos.” |
| 2.3 | Correo inexistente | `401`, **mismo mensaje** que 2.2 |
| 2.4 | Cuerpo inválido | `400` |
| 3.1 | `GET /auth/me` con `Bearer {{token}}` | `200` `{user:{idUsuario,nombre,correo}}` |
| 3.2 | `/me` sin token | `401` |
| 3.3 | `/me` con token alterado | `401` |
| 3.4 | `/me?idUsuario=999999` | `200` con el usuario **del token** (ignora el id) |

Ejemplo manual con curl:

```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" \
  -d '{"nombre":"Ana Pérez","correo":"ana@correo.com","password":"UnaClaveSegura123!"}'
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

Comprobaciones extra recomendadas en SSMS (tras registrar):

```sql
SELECT idUsuario, nombre, correo, LEFT(passwordHash, 7) AS prefijoHash, LEN(passwordHash) AS largo, estado
  FROM dbo.Usuario;      -- prefijoHash debe ser $2b$12$ (o $2a$/$2y$) y largo 60
```

- **Token vencido:** pon `JWT_EXPIRES_IN=5s` en `.env`, reinicia, haz login, espera 6 s y llama a `/me` → `401`. Devuelve el valor a `2h`.
- **Cuenta deshabilitada:** `UPDATE dbo.Usuario SET estado = 0 WHERE correo='ana@correo.com';` → login con la clave correcta da `403`, `/me` con un token anterior da `401`. Restaura con `estado = 1`.
- **Carrera de duplicados:** dos registros simultáneos con el mismo correo → uno `201` y otro `409` (lo decide el UNIQUE de SQL Server).

## 6. Decisiones y comportamientos que debes conocer

**Formato de errores** (el contrato no lo define): `{ "message": "...", "errors": { "campo": "..." } }`; `errors` solo en `400`.

**Decisión sobre el token (según el contrato, sección “Seguridad mínima”).** El JWT vive **solo en memoria** del frontend
(estado de React). No se guarda en `localStorage` para no exponerlo a robo por XSS. **Consecuencia:** al recargar la página
(F5) se pierde la sesión y hay que iniciar sesión de nuevo. Si el equipo quiere persistir sesión, debe decidirlo explícitamente
(p. ej. cookie `HttpOnly` + `SameSite` + protección CSRF) y documentar el riesgo; no es “seguridad perfecta” en ningún caso.

**Seguridad aplicada:** consultas parametrizadas; correo recortado y en minúsculas; `bcrypt` (costo 12 por defecto, rango 10–12) y
`bcrypt.compare`; JWT `HS256` con `sub` = id y expiración (`2h`); `JWT_SECRET` obligatorio de ≥ 32 caracteres; mismo mensaje y
trabajo de bcrypt para correo inexistente o clave incorrecta; el `403` de cuenta deshabilitada solo se muestra **después** de acertar
la clave; el id del usuario sale siempre del JWT; `helmet`; CORS limitado a `CORS_ORIGIN`; límite de intentos (429) en login/registro;
cuerpo JSON máx. 10 KB; sin stack traces al cliente; no se registran contraseñas, tokens ni cuerpos de petición.

**Limitaciones conocidas**
- `409` en el registro revela que un correo existe (es inherente al contrato; el rate limit lo mitiga).
- El rate limit es en memoria (se reinicia con el servidor) y por IP; suficiente para el piloto.
- Contraseña máxima de **72 bytes** (límite de bcrypt; añadido a las reglas del contrato).
- La casilla de términos y la confirmación de contraseña solo se validan en el frontend y **no** se envían (ver “Diferencias Figma ↔ contrato”).
- Fuente: se usa `DM Sans` si está instalada y, si no, la fuente del sistema (no se carga de Google Fonts para no hacer peticiones externas).
- El `package-lock.json` debe generarse con el primer `npm install` en `backend/` y `frontend/` y **commitearse**.

### Diferencias Figma ↔ contrato (decididas sin cambiar el contrato)

| Figma | Decisión |
|-------|----------|
| Registro: “Confirmar contraseña” | Solo validación en el frontend; no viaja al backend (el contrato recibe 3 campos). |
| Registro: casilla “Acepto términos y política de protección de datos” | Obligatoria en el frontend, **no se guarda**: `dbo.ConsentimientoDatos` solo admite finalidades `REGISTRO_EMOCIONAL` y `CONVERSACION_IA`. Debe resolverse en el módulo de consentimiento. |
| “¿Olvidaste tu contraseña?” y “Política de privacidad” | Fuera de alcance: se muestran como en Figma, pero solo despliegan un aviso “no disponible/próximamente”. |
| Pantalla “Cambiar contraseña” (RF14) y resto de pantallas | No implementadas (fuera del Módulo 1). |
| Tras registrarse/entrar | Pantalla provisional “Hola, {nombre}” que llama a `GET /auth/me` y permite cerrar sesión (no existe en Figma; sirve de confirmación). |

## 7. Lista de comprobación del módulo

- [ ] Ejecuté `database/01_schema_seed_MenteConecta.sql` en SSMS y existe `dbo.Usuario`.
- [ ] `backend/.env` creado desde `.env.example` (con `JWT_SECRET` propio) y **no** aparece en `git status`.
- [ ] `npm run db:check` muestra conexión correcta y tabla `dbo.Usuario`.
- [ ] `npm test` (backend) pasa.
- [ ] Postman: colección completa en verde (12 peticiones).
- [ ] En SSMS, `passwordHash` empieza por `$2b$` y no contiene la contraseña.
- [ ] Registrar `Ana@Correo.com` y luego `ana@correo.com` → el segundo da `409` y hay una sola fila.
- [ ] Login con clave errónea → `401` con el mismo mensaje que con correo inexistente.
- [ ] `/api/auth/me` rechaza: sin token, token alterado y token vencido.
- [ ] Ninguna respuesta de la API contiene `passwordHash`.
- [ ] Frontend: registro con errores de validación, con correo duplicado (mensaje en el campo) y exitoso (“Cuenta creada correctamente”).
- [ ] Frontend: login con error (mensaje claro), estado “Iniciando sesión…” y éxito; “Cerrar sesión” vuelve al login.
- [ ] Frontend en móvil (DevTools, 390 px): sin scroll horizontal y con el diseño de una columna.
- [ ] Un clon limpio sigue este README sin ayuda adicional.

## 8. Para mis compañeros mañana

```bash
git clone <URL-del-repositorio-en-GitHub>
cd MenteConecta

# 1) Base de datos: en SSMS ejecuta database/01_schema_seed_MenteConecta.sql
#    y crea el login SQL (sección 2 de este README).

# 2) Backend (terminal 1)
cd backend
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
#   -> edita .env: DB_USER, DB_PASSWORD, DB_INSTANCE/DB_PORT según tu SQL Server, y JWT_SECRET
npm run db:check
npm run dev

# 3) Frontend (terminal 2)
cd frontend
npm install
npm run dev                 # abre http://localhost:5173
```

Reglas para continuar sin cambiar la arquitectura:
1. **Nunca** subas `.env` (ya está en `.gitignore`); cada quien crea el suyo. Si añades una variable, agrégala a `.env.example` **sin valor real**.
2. Respeta `docs/04_Contrato_API_Auth.md`. Si necesitas cambiar una ruta o JSON, propónlo al equipo y actualiza el contrato **antes** del código.
3. Sigue el patrón ruta → controlador → servicio → repositorio; el SQL solo en `backend/src/db/*Repository.js`, siempre con `.input(...)`.
4. El id del usuario se obtiene **siempre** de `req.auth.idUsuario` (JWT), nunca de `body`, `query` ni `params`. Para rutas protegidas usa el middleware `authenticate`.
5. No modifiques `database/01_schema_seed_MenteConecta.sql` en silencio: los cambios de esquema se hacen en un script nuevo numerado (`02_...sql`) y se avisan al equipo.
6. Antes de abrir un PR: `cd backend && npm test` y `cd frontend && npm run build`.
7. Flujo Git sugerido: una rama por tarea (`feature/...`), PR pequeño, el otro integrante revisa.
8. Siguiente módulo (no implementado): consentimiento (`/api/consent`) → emociones → registros emocionales → biblioteca → chat con Gemini (la clave de Gemini **solo** en el backend).
