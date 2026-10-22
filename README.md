# MenteConecta — módulos 1 y 2: acceso y registro emocional

Piloto de bienestar emocional para estudiantes del TdeA. El repositorio contiene el **Módulo 1**
(registro e inicio de sesión) y el **Módulo 2** (consentimiento para la finalidad `REGISTRO_EMOCIONAL`
y registro emocional personal). Biblioteca y Gemini siguen fuera de alcance.

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
│   │   ├── db/*Repository.js        SQL parametrizado para usuarios, consentimiento y emociones
│   │   ├── validation/              reglas de validación del servidor
│   │   ├── services/authService.js  registro, login, JWT (bcrypt)
│   │   ├── controllers/ routes/ middleware/   capa HTTP delgada
│   │   ├── app.js                   arma Express (sin abrir puertos: se puede probar)
│   │   └── server.js                arranque
│   ├── tests/                       pruebas con `node:test` (repositorio en memoria)
│   ├── scripts/check-db.js          verifica la conexión desde Node
│   └── .env.example
├── frontend/                React + Vite (src/pages, components, api, validation)
├── database/01_schema_seed_MenteConecta.sql   esquema base (sin cambios para el módulo 2)
├── docs/                    contratos de API, MER, diagramas, capturas de Figma
└── postman/                 colecciones de autenticación y módulo 2
```

Convención de arquitectura (para no romperla al continuar): **ruta → controlador → servicio → repositorio**.
Solo `db/*Repository.js` escribe SQL; los servicios no conocen HTTP; los controladores no conocen SQL.
Los módulos nuevos añaden sus propios `*Routes/Controller/Service/Repository` y se registran en
`backend/src/app.js`.

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

Usan repositorios en memoria. Cubren autenticación, validaciones y flujo HTTP del consentimiento/emociones,
incluyendo autorización por propietario. **No cubren** las consultas SQL reales ni las restricciones reales
de SQL Server → usa Postman (siguiente sección).

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

### Módulo 2 (consentimiento y emociones)

1. Importa `postman/MenteConecta-Consentimiento-Emociones.postman_collection.json`.
2. Confirma que el backend y SQL Server están disponibles: `http://localhost:3000/api/health` responde
   `{"status":"ok"}`. El frontend debe abrirse desde `http://localhost:5173` para coincidir con CORS.
3. Ejecuta las peticiones en orden. Se crean dos cuentas de prueba con correos sintéticos únicos;
   no uses datos personales reales. La colección comprueba JWT obligatorio, consentimiento requerido,
   aceptación explícita, validación de emoción, historial y propiedad al eliminar.
4. **Para mostrar persistencia en SQL Server:** ejecuta solo las peticiones 1–11 (individualmente o
   seleccionándolas en Runner) y no ejecutes aún la 12. Después de la petición 11 (“Usuario ajeno no
   puede eliminar el registro”), copia el valor `email` de variables de colección y ejecuta en SSMS
   las consultas de verificación de abajo. La colección borra el registro propio en la petición 12.
5. Ejecuta la petición 12 para demostrar la eliminación del propio registro (`204`). Vuelve a correr
   la consulta de emociones: ya no debe aparecer ese `idRegistro`; el consentimiento se conserva.
6. Rutas y formatos completos: [docs/05_Contrato_API_Consentimiento_Emociones.md](docs/05_Contrato_API_Consentimiento_Emociones.md).

El esquema existente ya contiene `dbo.PoliticaPrivacidad`, `dbo.ConsentimientoDatos`,
`dbo.Emocion` y `dbo.RegistroEmocional`, así que **no se necesita migración SQL**. En una instalación
nueva ejecuta `database/01_schema_seed_MenteConecta.sql` como se describe arriba. La política `1.0`
sembrada es un borrador pendiente de aprobación institucional; actualiza el texto mediante el proceso
institucional antes de recopilar datos reales. El servicio limita el registro a Calma, Alegría, Tristeza
y Ansiedad aunque el catálogo inicial contenga otras emociones.

#### Evidencia de persistencia en SSMS

La colección genera un correo nuevo en cada ejecución. Copia el valor de `email` desde Postman
(*Collection → Variables*) y reemplaza el valor de `@correo` antes de ejecutar este bloque en SSMS.
Hazlo después de la petición 11 y antes de la 12. Son consultas de solo lectura:

```sql
USE MenteConecta;
GO

DECLARE @correo NVARCHAR(254) = N'modulo2.COPIA_AQUI_EL_VALOR_DE_POSTMAN@correo.com';

-- Debe existir una aceptación para REGISTRO_EMOCIONAL, con fecha y política.
SELECT u.correo, p.version AS versionPolitica, c.finalidad, c.aceptado,
       c.fechaAceptacion, c.revocadoEn
FROM dbo.ConsentimientoDatos AS c
INNER JOIN dbo.Usuario AS u ON u.idUsuario = c.idUsuario
INNER JOIN dbo.PoliticaPrivacidad AS p ON p.idPolitica = c.idPolitica
WHERE u.correo = @correo
  AND c.finalidad = N'REGISTRO_EMOCIONAL';

-- Antes de borrar: debe mostrar Calma, intensidad 3 y la nota de Postman.
-- También prueba que el registro referencia al consentimiento de ese usuario.
SELECT r.idRegistro, u.correo, e.nombre AS emocion, r.intensidad, r.nota,
       r.fecha, c.finalidad, c.aceptado, c.idConsentimiento
FROM dbo.RegistroEmocional AS r
INNER JOIN dbo.Usuario AS u ON u.idUsuario = r.idUsuario
INNER JOIN dbo.Emocion AS e ON e.idEmocion = r.idEmocion
INNER JOIN dbo.ConsentimientoDatos AS c
  ON c.idConsentimiento = r.idConsentimiento
 AND c.idUsuario = r.idUsuario
WHERE u.correo = @correo
ORDER BY r.fecha DESC, r.idRegistro DESC;
```

Resultados esperados antes de la petición 12: consentimiento `REGISTRO_EMOCIONAL` con `aceptado = 1`;
un registro `Calma`, intensidad `3`, nota `Prueba local de Postman` y fecha UTC. La petición 11 intenta
borrar ese registro con otro usuario y espera `404`; la consulta debe confirmar que el registro sigue
existiendo. Después de la petición 12, la segunda consulta debe devolver cero filas para ese usuario.
El primer resultado (consentimiento) debe seguir presente. No compartas capturas que expongan tokens,
contraseñas ni notas emocionales reales.

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
- En registro, la casilla de términos generales y la confirmación de contraseña solo se validan en el frontend y **no** se envían. No son ni sustituyen el consentimiento específico `REGISTRO_EMOCIONAL`.
- `npm test` usa repositorios en memoria; demuestra las reglas y respuestas de la API, pero no ejecuta SQL Server.
  La persistencia real se evidencia con la colección Postman y las consultas de solo lectura anteriores.
- Fuente: se usa `DM Sans` si está instalada y, si no, la fuente del sistema (no se carga de Google Fonts para no hacer peticiones externas).
- El `package-lock.json` debe generarse con el primer `npm install` en `backend/` y `frontend/` y **commitearse**.

### Diferencias Figma ↔ contrato (decididas sin cambiar el contrato)

| Figma | Decisión |
|-------|----------|
| Registro: “Confirmar contraseña” | Solo validación en el frontend; no viaja al backend (el contrato recibe 3 campos). |
| Registro: casilla “Acepto términos y política de protección de datos” | Obligatoria en el frontend, **no se guarda**. El consentimiento específico para `REGISTRO_EMOCIONAL` se solicita después de iniciar sesión, en el Módulo 2; no reutiliza esta aceptación general. |
| “¿Olvidaste tu contraseña?” y “Política de privacidad” | Fuera de alcance: se muestran como en Figma, pero solo despliegan un aviso “no disponible/próximamente”. |
| Pantalla “Cambiar contraseña” (RF14) y resto de pantallas | No implementadas (fuera del Módulo 1). |
| Tras registrarse/entrar | Pantalla provisional “Hola, {nombre}” que llama a `GET /auth/me` y permite cerrar sesión (no existe en Figma; sirve de confirmación). |

## 7. Lista de comprobación del módulo

- [ ] Ejecuté `database/01_schema_seed_MenteConecta.sql` en SSMS y existe `dbo.Usuario`.
- [ ] `backend/.env` creado desde `.env.example` (con `JWT_SECRET` propio) y **no** aparece en `git status`.
- [ ] `npm run db:check` muestra conexión correcta y tabla `dbo.Usuario`.
- [ ] `npm test` (backend) pasa.
- [ ] Postman: colección de autenticación completa en verde (12 peticiones).
- [ ] Postman: colección del módulo 2 completa en verde con SQL Server real (12 peticiones).
- [ ] SSMS: aceptación y registro de Postman visibles antes de la petición de borrado propio; registro ausente después.
- [ ] Módulo 2: sin consentimiento no se crea un registro; intensidad/notas inválidas y campos adicionales se rechazan.
- [ ] Módulo 2: historial solo muestra registros propios y un usuario no elimina registros ajenos.
- [ ] Política institucional revisada/aprobada antes de recopilar datos reales (el texto incluido es borrador).
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
8. Próximos módulos (no implementados): biblioteca y chat con Gemini (la clave de Gemini **solo** en el backend). El Módulo 2 no envía registros ni notas a servicios externos.

## 9. Punto de partida para el siguiente módulo

El siguiente alcance sugerido es la **biblioteca de recursos de bienestar**; no iniciar Gemini todavía.
El esquema inicial ya define `dbo.CategoriaRecurso`, `dbo.RecursoBienestar` y `dbo.Favorito`.
Antes de codificar, revisa las pantallas aprobadas y acuerda el alcance/contrato del módulo con el equipo.

- Mantén el patrón ruta → controlador → servicio → repositorio, el pool SQL único, las consultas
  parametrizadas y el JWT en memoria.
- Las rutas personales de favoritos deben filtrar siempre por `req.auth.idUsuario`. La lectura de recursos
  públicos no debe exponer campos no destinados al cliente.
- Añade el contrato y la colección Postman del módulo; amplía pruebas `node:test` sin reemplazar las
  pruebas existentes.
- Revisa si las tablas existentes satisfacen el alcance acordado. Si no, propone una migración incremental
  `database/02_...sql`; no cambies en silencio el script inicial.
- No reutilices el consentimiento `REGISTRO_EMOCIONAL` para finalidades nuevas. Un futuro chat con Gemini
  requiere consentimiento separado `CONVERSACION_IA`, revisión del flujo de datos y secreto solo en backend.
- Antes de abrir un PR, valida `cd backend; npm test` y `cd frontend; npm run build`. La integración
  SQL real se valida aparte con Postman y SSMS.
