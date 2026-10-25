# MenteConecta

Piloto de bienestar emocional para estudiantes del TdeA. El repositorio tiene implementados:

- **Módulo 1:** registro, inicio de sesión y consulta del usuario autenticado.
- **Módulo 2:** consentimiento para `REGISTRO_EMOCIONAL` y registro, consulta y eliminación de emociones propias.

## Tecnologías

- Frontend: React 18 y Vite.
- Backend: Node.js 20 o superior y Express.
- Base de datos: SQL Server.
- Autenticación: bcrypt y JWT.

## Preparar el entorno local

Necesitas Node.js 20+, npm, SQL Server y SSMS. Los pasos siguientes están escritos para PowerShell.

### 1. Clonar el proyecto

```powershell
git clone <URL-del-repositorio>
cd menteconecta
```

### 2. Crear la base de datos

1. Abre SSMS, conéctate a tu instancia y ejecuta `database/01_schema_seed_MenteConecta.sql`.
2. El script crea `MenteConecta`, sus tablas y los catálogos iniciales. No crea usuarios de prueba.
3. En SSMS, habilita el modo de autenticación SQL en las propiedades del servidor. En SQL Server
   Configuration Manager, habilita TCP/IP y reinicia el servicio si hiciste cambios. Crea un login con
   permisos sobre la base:

```sql
CREATE LOGIN menteconecta_app WITH PASSWORD = 'ReemplazaEstaClave#2026', CHECK_POLICY = ON;
GO
USE MenteConecta;
CREATE USER menteconecta_app FOR LOGIN menteconecta_app;
ALTER ROLE db_datareader ADD MEMBER menteconecta_app;
ALTER ROLE db_datawriter ADD MEMBER menteconecta_app;
GO
```

Usa una contraseña propia para tu entorno local. Si tu instancia tiene nombre, configura `DB_INSTANCE`
en `.env`; las demás opciones de conexión están explicadas en `backend/.env.example`.

### 3. Configurar e iniciar el backend

En una terminal de PowerShell:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edita el archivo `.env` de esa carpeta con la configuración de tu SQL Server (`DB_SERVER`, `DB_PORT` o `DB_INSTANCE`,
`DB_USER` y `DB_PASSWORD`). Genera un secreto JWT local y reemplaza `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

No compartas ni subas `backend/.env`. Comprueba la conexión y arranca la API:

```powershell
npm run db:check
npm run dev
```

La API queda en `http://localhost:3000/api`; el endpoint de salud es `GET /api/health`.

### 4. Configurar e iniciar el frontend

Abre otra terminal desde la raíz del proyecto:

```powershell
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Ese origen debe coincidir con `CORS_ORIGIN` en el `.env` del backend.

### 5. Ejecutar las pruebas

En otra terminal desde la raíz del proyecto:

```powershell
cd backend
npm test
```

Las pruebas automatizadas usan repositorios en memoria y no necesitan SQL Server. Para comprobar la
conexión real, usa `npm run db:check`; puedes registrar una cuenta desde la aplicación y verificar los
datos en SSMS. Antes de enviar cambios, abre otra terminal desde la raíz y valida la compilación:

```powershell
cd frontend
npm run build
```

## Organización y reglas para continuar

El backend sigue el patrón **ruta → controlador → servicio → repositorio**. Las consultas SQL van en
`backend/src/db/*Repository.js` y deben ser parametrizadas. Los servicios no conocen HTTP y los
controladores no escriben SQL. Para rutas protegidas, el usuario se obtiene del JWT validado
(`req.auth.idUsuario`), nunca de un identificador enviado por el cliente.

Contratos y diagramas vigentes:

- Autenticación: [docs/04_Contrato_API_Auth.md](docs/04_Contrato_API_Auth.md).
- Consentimiento y emociones: [docs/05_Contrato_API_Consentimiento_Emociones.md](docs/05_Contrato_API_Consentimiento_Emociones.md).
- Documentación del piloto: [docs/README_Documentacion_Piloto.md](docs/README_Documentacion_Piloto.md).

No cambies rutas, formatos ni el esquema sin acordarlo con el equipo y actualizar primero la documentación.
Si se requiere una modificación de base de datos, crea una migración incremental numerada; no alteres en
silencio el script inicial. Nunca subas secretos ni datos personales o emocionales reales.

## Siguiente paso acordado

El siguiente módulo es la **biblioteca de recursos de bienestar**, incluyendo consulta por categorías y
favoritos. El esquema inicial ya contempla `dbo.CategoriaRecurso`, `dbo.RecursoBienestar` y `dbo.Favorito`.
Antes de implementarlo, revisa las pantallas aprobadas y acuerda con el equipo el alcance y el contrato.
Luego integra el módulo siguiendo la arquitectura existente y agrega pruebas automatizadas. No iniciar aún
la integración con Gemini: un futuro chat requerirá un alcance y consentimiento propios; su clave debe
permanecer exclusivamente en el backend.

## Pendiente sobre contraseñas

A petición del profesor queda pendiente definir cómo atender la recuperación de la contraseña de un
usuario. La contraseña se guarda como hash bcrypt: **no es posible desencriptar el hash** para obtener
la contraseña original. Revisar con el profesor una alternativa segura —normalmente un flujo para
restablecerla— en lugar de intentar recuperar o mostrar la contraseña existente.
